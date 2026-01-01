const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Message, Conversation } = require('../Models/Chat');
const User = require('../Models/User');

let io;

/**
 * Calculate and update average response time for a user
 * Response time = time between receiving a message and sending a reply
 * @param {String} conversationId - The conversation ID
 * @param {String} responderId - The user who is responding
 */
const calculateAndUpdateResponseTime = async (conversationId, responderId) => {
    try {
        console.log(`📊 [RESPONSE_TIME] Calculating for conversation ${conversationId}, responder ${responderId}`);

        // Get last 2 messages in this conversation
        const recentMessages = await Message.find({
            conversation: conversationId,
            isDeleted: { $ne: true }
        })
            .sort({ createdAt: -1 })
            .limit(2)
            .lean();

        console.log(`📊 [RESPONSE_TIME] Found ${recentMessages.length} messages`);

        // Need at least 2 messages (the current reply and the previous message)
        if (recentMessages.length < 2) {
            console.log(`📊 [RESPONSE_TIME] Not enough messages, skipping`);
            return;
        }

        const currentMessage = recentMessages[0]; // The reply just sent
        const previousMessage = recentMessages[1]; // The message being replied to

        console.log(`📊 [RESPONSE_TIME] Current msg sender: ${currentMessage.sender}, Previous msg sender: ${previousMessage.sender}`);

        // Check if this is actually a response (previous message from different user)
        if (previousMessage.sender.toString() === responderId) {
            // Same person sent both messages, not a response
            console.log(`📊 [RESPONSE_TIME] Same sender, not a response, skipping`);
            return;
        }

        // Calculate response time in minutes
        const previousTime = new Date(previousMessage.createdAt);
        const currentTime = new Date(currentMessage.createdAt);
        const responseTimeMinutes = Math.round((currentTime - previousTime) / (1000 * 60));

        console.log(`📊 [RESPONSE_TIME] Response time: ${responseTimeMinutes} minutes`);

        // Only count reasonable response times (between 1 minute and 24 hours)
        if (responseTimeMinutes < 1 || responseTimeMinutes > 1440) {
            console.log(`📊 [RESPONSE_TIME] Time out of range (${responseTimeMinutes}), skipping`);
            return;
        }

        // Get current user's response time data
        const user = await User.findById(responderId).select('responseTime responseTimeCount');

        if (!user) {
            console.log(`📊 [RESPONSE_TIME] User not found`);
            return;
        }

        // Calculate new average response time
        const currentAvg = user.responseTime || 0;
        const count = user.responseTimeCount || 0;

        // Weighted average: ((currentAvg * count) + newValue) / (count + 1)
        const newAvg = count === 0
            ? responseTimeMinutes
            : Math.round(((currentAvg * count) + responseTimeMinutes) / (count + 1));

        // Update user's response time
        await User.findByIdAndUpdate(responderId, {
            responseTime: newAvg,
            responseTimeCount: count + 1
        });

        console.log(`📊 [RESPONSE_TIME] ✅ Updated for user ${responderId}: ${newAvg} min (from ${count + 1} responses)`);

    } catch (error) {
        console.error('Error calculating response time:', error);
    }
};

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ['http://localhost:5000', 'http://localhost:5173', 'http://localhost:3001', 'http://localhost:4200'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Middleware for authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error'));
            }

            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = payload.id;
            socket.userEmail = payload.email;

            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Join user's personal room
        socket.join(`user:${socket.userId}`);

        // Update user's online status in database
        try {
            const User = require('../Models/User');
            await User.findByIdAndUpdate(socket.userId, {
                isOnline: true,
                lastSeen: new Date()
            });
        } catch (error) {
            console.error('Error updating online status on connect:', error);
        }

        // Notify all users that this user is online
        socket.broadcast.emit('user_online', { userId: socket.userId });

        // Send list of all online users to the newly connected user
        const onlineUserIds = Array.from(io.sockets.sockets.keys())
            .map(socketId => io.sockets.sockets.get(socketId)?.userId)
            .filter(Boolean);
        socket.emit('online_users', onlineUserIds);
        console.log(`📤 Sent online users list to ${socket.userId}:`, onlineUserIds);

        // Join conversation
        socket.on('join_conversation', async (conversationId) => {
            console.log(`🚪 [JOIN] User ${socket.userId} joining conversation ${conversationId}`);
            try {
                // Verify user is participant
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                const isParticipant = conversation.participants.some(
                    p => p.toString() === socket.userId
                );

                if (!isParticipant) {
                    socket.emit('error', { message: 'Not a participant' });
                    return;
                }

                socket.join(`conversation:${conversationId}`);
                console.log(`✅ [JOIN] User ${socket.userId} joined conversation ${conversationId}`);
            } catch (error) {
                console.error(`❌ [JOIN] Error:`, error.message);
                socket.emit('error', { message: error.message });
            }
        });

        // Join job room for lightweight public updates (views, status)
        socket.on('join_job', async (jobId) => {
            try {
                if (!jobId) return;
                socket.join(`job:${jobId}`);
                console.log(`✅ [JOIN] User ${socket.userId} joined job room job:${jobId}`);
            } catch (error) {
                console.error(`❌ [JOIN JOB] Error:`, error.message);
            }
        });

        socket.on('leave_job', (jobId) => {
            try {
                if (!jobId) return;
                socket.leave(`job:${jobId}`);
                console.log(`✅ [LEAVE] User ${socket.userId} left job room job:${jobId}`);
            } catch (error) {
                console.error(`❌ [LEAVE JOB] Error:`, error.message);
            }
        });

        // Leave conversation
        socket.on('leave_conversation', (conversationId) => {
            console.log(`🚪 [LEAVE] User ${socket.userId} leaving conversation ${conversationId}`);
            socket.leave(`conversation:${conversationId}`);
            console.log(`✅ [LEAVE] User ${socket.userId} left conversation ${conversationId}`);
        });

        // Send message
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, content, attachments } = data;

                // Verify conversation
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) {
                    socket.emit('error', { message: 'Conversation not found' });
                    return;
                }

                const isParticipant = conversation.participants.some(
                    p => p.toString() === socket.userId
                );

                if (!isParticipant) {
                    socket.emit('error', { message: 'Not a participant' });
                    return;
                }

                // Create message
                const message = await Message.create({
                    conversation: conversationId,
                    sender: socket.userId,
                    content,
                    attachments: attachments || []
                });

                // Update conversation
                conversation.lastMessage = message._id;
                conversation.lastMessageAt = new Date();
                await conversation.save();

                // Calculate response time for the sender AFTER message is saved
                await calculateAndUpdateResponseTime(conversationId, socket.userId);

                await message.populate('sender', 'first_name last_name profile_picture profile_picture_url');

                // Emit to all participants in the conversation
                io.to(`conversation:${conversationId}`).emit('new_message', message);

                // Check if other participants are online and mark as delivered
                const otherParticipants = conversation.participants.filter(
                    p => p.toString() !== socket.userId
                );

                // Mark as delivered if any recipient is online
                const onlineRecipients = otherParticipants.filter(participantId => {
                    const room = io.sockets.adapter.rooms.get(`user:${participantId}`);
                    return room && room.size > 0;
                });

                if (onlineRecipients.length > 0) {
                    message.isDelivered = true;
                    message.deliveredAt = new Date();
                    await message.save();

                    // Notify sender that message was delivered
                    io.to(`user:${socket.userId}`).emit('messageDelivered', {
                        messageId: message._id,
                        conversationId,
                        deliveredAt: message.deliveredAt
                    });
                }

                // Notify other participants
                otherParticipants.forEach(participantId => {
                    io.to(`user:${participantId}`).emit('new_message_notification', {
                        conversationId,
                        message
                    });
                });

            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Typing indicator
        socket.on('typing', (data) => {
            const { conversationId, isTyping } = data;
            socket.to(`conversation:${conversationId}`).emit('user_typing', {
                userId: socket.userId,
                isTyping
            });
        });

        // Typing indicator
        socket.on('typing', ({ conversationId, isTyping }) => {
            socket.to(`conversation:${conversationId}`).emit('user_typing', {
                userId: socket.userId,
                isTyping
            });
        });

        // Online status update
        socket.on('update_status', async ({ isOnline }) => {
            try {
                const User = require('../Models/User');
                await User.findByIdAndUpdate(socket.userId, {
                    isOnline,
                    lastSeen: new Date()
                });

                // Broadcast to all users
                socket.broadcast.emit('user_status_changed', {
                    userId: socket.userId,
                    isOnline,
                    lastSeen: new Date()
                });
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        // Proposal events
        socket.on('proposal_submitted', (data) => {
            const { clientId, proposalId, jobId } = data;
            io.to(`user:${clientId}`).emit('new_proposal', {
                proposalId,
                jobId,
                timestamp: new Date()
            });
        });

        socket.on('proposal_accepted', (data) => {
            const { freelancerId, proposalId, jobId } = data;
            io.to(`user:${freelancerId}`).emit('proposal_status_changed', {
                proposalId,
                jobId,
                status: 'accepted',
                timestamp: new Date()
            });
        });

        // Contract events
        socket.on('contract_created', (data) => {
            const { freelancerId, clientId, contractId } = data;
            io.to(`user:${freelancerId}`).emit('new_contract', {
                contractId,
                timestamp: new Date()
            });
            io.to(`user:${clientId}`).emit('new_contract', {
                contractId,
                timestamp: new Date()
            });
        });

        socket.on('contract_completed', (data) => {
            const { freelancerId, clientId, contractId } = data;
            io.to(`user:${freelancerId}`).emit('contract_status_changed', {
                contractId,
                status: 'completed',
                timestamp: new Date()
            });
            io.to(`user:${clientId}`).emit('contract_status_changed', {
                contractId,
                status: 'completed',
                timestamp: new Date()
            });
        });

        // Notification events
        socket.on('send_notification', (data) => {
            const { userId, notification } = data;
            io.to(`user:${userId}`).emit('new_notification', notification);
        });

        // Disconnect and update status
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.userId}`);

            // Notify all users that this user is offline
            socket.broadcast.emit('user_offline', { userId: socket.userId });

            try {
                const User = require('../Models/User');
                await User.findByIdAndUpdate(socket.userId, {
                    isOnline: false,
                    lastSeen: new Date()
                });

                socket.broadcast.emit('user_status_changed', {
                    userId: socket.userId,
                    isOnline: false,
                    lastSeen: new Date()
                });
            } catch (error) {
                console.error('Error updating status on disconnect:', error);
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

// Helper to emit to specific user
const emitToUser = (userId, event, data) => {
    const socketIO = getIO();
    socketIO.to(`user:${userId}`).emit(event, data);
};

// Helper to emit to multiple users
const emitToUsers = (userIds, event, data) => {
    const socketIO = getIO();
    userIds.forEach(userId => {
        socketIO.to(`user:${userId}`).emit(event, data);
    });
};

module.exports = {
    initializeSocket,
    getIO,
    emitToUser,
    emitToUsers
};
