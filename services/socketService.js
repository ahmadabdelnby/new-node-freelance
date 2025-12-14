const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Message, Conversation } = require('../Models/Chat');

let io;

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

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.userId}`);

        // Join user's personal room
        socket.join(`user:${socket.userId}`);

        // Join conversation
        socket.on('join_conversation', async (conversationId) => {
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
                console.log(`User ${socket.userId} joined conversation ${conversationId}`);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
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

                await message.populate('sender', 'first_name last_name profile_picture_url');

                // Emit to all participants in the conversation
                io.to(`conversation:${conversationId}`).emit('new_message', message);

                // Notify other participants
                const otherParticipants = conversation.participants.filter(
                    p => p.toString() !== socket.userId
                );

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

        // Mark message as read
        socket.on('mark_as_read', async (data) => {
            try {
                const { messageId } = data;
                const message = await Message.findById(messageId);
                
                if (message && message.sender.toString() !== socket.userId) {
                    message.isRead = true;
                    message.readAt = new Date();
                    await message.save();

                    // Notify sender
                    io.to(`user:${message.sender}`).emit('message_read', {
                        messageId,
                        readAt: message.readAt
                    });
                }
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
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
