const { Message, Conversation } = require('../Models/Chat');
const mongoose = require('mongoose');
const { getIO } = require('../services/socketService');

// Create or get conversation
const createOrGetConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { participantId, jobId, proposalId } = req.body;

        if (!participantId) {
            return res.status(400).json({
                message: 'participantId is required'
            });
        }

        // Check if conversation exists
        let conversation = await Conversation.findOne({
            participants: { $all: [userId, participantId] }
        })
            .populate('participants', 'first_name last_name profile_picture profile_picture_url email')
            .populate('job', 'title')
            .populate('proposal')
            .populate('lastMessage');

        if (!conversation) {
            // Create new conversation
            conversation = await Conversation.create({
                participants: [userId, participantId],
                job: jobId,
                proposal: proposalId
            });

            await conversation.populate('participants', 'first_name last_name profile_picture profile_picture_url email');
        }

        res.status(200).json({
            message: 'Conversation retrieved successfully',
            conversation
        });
    } catch (error) {
        console.error('Create/Get conversation error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get user's conversations
const getMyConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('🔍 Getting conversations for userId:', userId);

        // First, let's check if there are ANY conversations in the database
        const totalConversations = await Conversation.countDocuments();
        console.log('📊 Total conversations in database:', totalConversations);

        const conversations = await Conversation.find({
            participants: userId
        })
            .populate('participants', 'first_name last_name profile_picture profile_picture_url email')
            .populate('job', 'title')
            .populate('lastMessage')
            .sort({ lastMessageAt: -1 });

        console.log('✅ Found conversations for this user:', conversations.length);

        res.status(200).json({
            count: conversations.length,
            conversations
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get ALL conversations (Admin only)
const getAllConversations = async (req, res) => {
    try {
        console.log('🔍 [ADMIN] Getting ALL conversations from database');

        const conversations = await Conversation.find({})
            .populate('participants', 'first_name last_name profile_picture profile_picture_url email')
            .populate('job', 'title')
            .populate('lastMessage')
            .sort({ lastMessageAt: -1 });

        console.log('✅ [ADMIN] Found total conversations:', conversations.length);

        res.status(200).json({
            count: conversations.length,
            conversations
        });
    } catch (error) {
        console.error('Get all conversations error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Send message
const sendMessage = async (req, res) => {
    try {
        console.log('📨 [RECEIVE] Received sendMessage request from user:', req.user.id);
        const senderId = req.user.id;
        const { conversationId, content, attachments } = req.body;
        console.log('📨 [RECEIVE] Request body:', { conversationId, content });

        if (!conversationId || !content) {
            return res.status(400).json({
                message: 'conversationId and content are required'
            });
        }

        // Check if conversation exists and user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found'
            });
        }

        const isParticipant = conversation.participants.some(
            p => p.toString() === senderId
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        // Create message
        const message = await Message.create({
            conversation: conversationId,
            sender: senderId,
            content,
            attachments: attachments || []
        });

        // Update conversation last message
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        await message.populate('sender', 'first_name last_name profile_picture profile_picture_url');

        // Emit real-time event to conversation room
        console.log(`📨 [SEND] Emitting new_message to conversation:${conversationId}`);
        const io = getIO();
        io.to(`conversation:${conversationId}`).emit('new_message', message);
        console.log(`✅ [SEND] Message emitted to conversation room`);

        // Notify other participants
        const otherParticipants = conversation.participants.filter(
            p => p.toString() !== senderId
        );

        console.log(`🔔 [NOTIFY] Notifying ${otherParticipants.length} other participants:`, otherParticipants);
        otherParticipants.forEach(participantId => {
            console.log(`🔔 [NOTIFY] Sending notification to user:${participantId}`);
            io.to(`user:${participantId}`).emit('new_message_notification', {
                conversationId,
                message
            });
        });

        res.status(201).json({
            message: message
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get conversation messages
const getConversationMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Check if user is participant
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found'
            });
        }

        const isParticipant = conversation.participants.some(
            p => p.toString() === userId
        );

        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        const skip = (page - 1) * limit;

        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'first_name last_name profile_picture profile_picture_url')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Message.countDocuments({ conversation: conversationId });

        res.status(200).json({
            messages: messages.reverse(), // Reverse to show oldest first
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Mark message as read
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                message: 'Message not found'
            });
        }

        // Only recipient can mark as read
        if (message.sender.toString() === userId) {
            return res.status(400).json({
                message: 'Cannot mark your own message as read'
            });
        }

        message.isRead = true;
        message.readAt = new Date();
        await message.save();

        res.status(200).json({
            message: 'Message marked as read'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Delete message
const deleteMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                message: 'Message not found'
            });
        }

        // Only sender can delete
        if (message.sender.toString() !== userId) {
            return res.status(403).json({
                message: 'You can only delete your own messages'
            });
        }

        await message.deleteOne();

        res.status(200).json({
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Edit message
const editMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messageId } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                message: 'Content is required'
            });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                message: 'Message not found'
            });
        }

        // Only sender can edit
        if (message.sender.toString() !== userId) {
            return res.status(403).json({
                message: 'You can only edit your own messages'
            });
        }

        // Check if message was sent within last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (message.createdAt < fiveMinutesAgo) {
            return res.status(400).json({
                message: 'Messages can only be edited within 5 minutes'
            });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        res.status(200).json({
            message: 'Message edited successfully',
            data: message
        });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Mark all messages in conversation as read
const markAllMessagesAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found'
            });
        }

        // Check if user is participant
        const isParticipant = conversation.participants.some(
            p => p.toString() === userId
        );
        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        // Mark all unread messages as read
        const result = await Message.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: userId },
                isRead: false
            },
            {
                $set: {
                    isRead: true,
                    readAt: new Date()
                }
            }
        );

        // Notify other participants via Socket.IO
        const io = req.app.get('io');
        if (io) {
            conversation.participants.forEach(participantId => {
                if (participantId.toString() !== userId) {
                    io.to(`user:${participantId}`).emit('messageRead', {
                        conversationId,
                        readBy: userId,
                        readAt: new Date()
                    });
                }
            });
        }

        res.status(200).json({
            message: 'All messages marked as read',
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Get unread count for user
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all conversations where user is participant
        const conversations = await Conversation.find({
            participants: userId
        }).select('_id');

        const conversationIds = conversations.map(c => c._id);

        // Count unread messages across all conversations
        const unreadCount = await Message.countDocuments({
            conversation: { $in: conversationIds },
            sender: { $ne: userId },
            isRead: false
        });

        res.status(200).json({
            unreadCount
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// Archive conversation
const archiveConversation = async (req, res) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({
                message: 'Conversation not found'
            });
        }

        // Check if user is participant
        const isParticipant = conversation.participants.some(
            p => p.toString() === userId
        );
        if (!isParticipant) {
            return res.status(403).json({
                message: 'You are not a participant in this conversation'
            });
        }

        // Toggle archive status
        const isArchived = conversation.archivedBy.includes(userId);

        if (isArchived) {
            // Unarchive
            conversation.archivedBy = conversation.archivedBy.filter(
                id => id.toString() !== userId
            );
        } else {
            // Archive
            conversation.archivedBy.push(userId);
        }

        conversation.isArchived = conversation.archivedBy.length > 0;
        await conversation.save();

        res.status(200).json({
            message: isArchived ? 'Conversation unarchived' : 'Conversation archived',
            conversation
        });
    } catch (error) {
        console.error('Archive conversation error:', error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

module.exports = {
    createOrGetConversation,
    getMyConversations,
    getAllConversations,
    sendMessage,
    getConversationMessages,
    markAsRead,
    deleteMessage,
    editMessage,
    markAllMessagesAsRead,
    getUnreadCount,
    archiveConversation
};
