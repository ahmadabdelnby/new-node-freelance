const Conversation = require('../Models/Conversation');
const Message = require('../Models/Message');
const mongoose = require('mongoose');

exports.sendMessage = async (req, res) => {
    try {
        console.log(req.user.userId);
        console.log(req.body.recipientId);

        const senderId = req.user.userId; // already string
        const { recipientId, content } = req.body;

        if (!recipientId || !content) {
            return res.status(400).json({ message: 'Missing recipientId or content' });
        }

        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

        let conversation = await Conversation.findOne({
            type: 'direct',
            participants: { $all: [senderObjectId, recipientObjectId] },
            isDeleted: false,
        }).where('participants').size(2);

        if (!conversation) {
            conversation = await Conversation.create({
                type: 'direct',
                participants: [senderObjectId, recipientObjectId],
                memberStates: [
                    { userId: senderObjectId, unreadCount: 0 },
                    { userId: recipientObjectId, unreadCount: 0 },
                ],
                lastMessageAt: new Date(),
            });
        }

        const message = await Message.create({
            conversationId: conversation._id,
            sender: senderObjectId,
            content,
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = message.createdAt;
        conversation.messageCount = (conversation.messageCount || 0) + 1;

        // update unread counts
        conversation.memberStates = conversation.memberStates.map(state => {
            if (!state.userId.equals(senderObjectId)) {
                state.unreadCount += 1;
            }
            return state;
        });

        await conversation.save();

        return res.status(201).json({
            message: 'Message sent successfully',
            data: message,
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};


exports.flagMessage = async (req, res) => {
    try {
        const reporterId = req.user.userId; // current user
        const { messageId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Flag reason is required' });
        }


        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            return res.status(400).json({ message: 'Invalid message ID' });
        }

        // 1. Find message
        const message = await Message.findById(messageId);
        if (!message || message.isDeleted) {
            return res.status(404).json({ message: 'Message not found' });
        }

        //2. Flag message
         message.isFlagged = true;

        // if (!message.flagReasons.includes(reason)) {
        //     message.flagReasons.push(reason);
        // }

        // Prevent duplicate reports by same user for same reason
        const alreadyFlagged = message.flaggedBy.some(
            f => f.userId.equals(reporterId) && f.reason === reason
        );
        if (!alreadyFlagged) {
            message.flaggedBy.push({ userId: reporterId, reason });
        }
        await message.save();

        // 3. Mark conversation as having flagged messages
        await Conversation.findByIdAndUpdate(
            message.conversationId,
            { $set: { hasFlaggedMessages: true } }
        );

        return res.status(200).json({
            message: 'Message flagged successfully',
            data: {
                messageId: message._id,
                conversationId: message.conversationId,
                reason,
                reporterId
            },
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};