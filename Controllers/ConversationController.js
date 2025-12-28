const Conversation = require('../Models/Conversation');
const Message = require('../Models/Message');
const mongoose = require('mongoose');

exports.getAllConversationsForAdmin = async (req, res) => {
  try {
    // 1. Find all non-deleted conversations
    const conversations = await Conversation.find({ isDeleted: false })
      .sort({ lastMessageAt: -1 }) // newest first
      .populate({
        path: 'participants',
        select: 'username profile.displayName profile.avatarUrl role' // limited fields
      })
      .populate({
        path: 'lastMessage',
        select: 'sender content createdAt isReported' // limited fields for admin
        // you can populate sender if needed:
        // populate: { path: 'sender', select: 'username role' }
      });

    // 2. Map to admin-friendly structure
    const result = conversations.map(convo => ({
      _id: convo._id,
      type: convo.type,
      participants: convo.participants,
      lastMessage: convo.lastMessage
        ? {
            _id: convo.lastMessage._id,
            content: convo.lastMessage.content,
            createdAt: convo.lastMessage.createdAt,
            isReported: convo.lastMessage.isReported,
            sender: convo.lastMessage.sender
          }
        : null,
      lastMessageAt: convo.lastMessageAt,
      messageCount: convo.messageCount || 0,
      isArchived: convo.isArchived,
      archivedBy: convo.archivedBy,
      memberStates: convo.memberStates.map(state => ({
        userId: state.userId,
        unreadCount: state.unreadCount,
        isUnderReview: state.isUnderReview
      }))
    }));

    return res.status(200).json({
      message: 'Conversations fetched successfully',
      data: result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};


exports.getReportedConversations = async (req, res) => {
  try {
    // 1️⃣ Find all conversations that have flagged messages
    const conversations = await Conversation.find({ 
      isDeleted: false,
      hasFlaggedMessages: true
    })
    .sort({ lastMessageAt: -1 })
    .populate({
      path: 'participants',
      select: 'username email profile.displayName profile.avatarUrl role'
    });

    const result = await Promise.all(conversations.map(async (convo) => {
      // 2️⃣ Get all messages of this conversation
      const messages = await Message.find({ conversationId: convo._id })
        .populate({ path: 'sender', select: 'username email role' })
        .sort({ createdAt: 1 }); // oldest first

      // 3️⃣ Build participants with their messages
      const participantsData = convo.participants.map(p => {
        const userMessages = messages
          .filter(m => m.sender && m.sender._id.equals(p._id))
          .map(m => {
            // Group flaggedBy
            let flaggedByGrouped = [];
            if (m.isFlagged && m.flaggedBy?.length) {
              const map = {};
              m.flaggedBy.forEach(f => {
                const key = f.userId.toString();
                if (!map[key]) {
                  map[key] = { userId: f.userId, email: f.email, reasons: [] };
                }
                if (!map[key].reasons.includes(f.reason)) {
                  map[key].reasons.push(f.reason);
                }
              });
              flaggedByGrouped = Object.values(map);
            }

            return {
              _id: m._id,
              content: m.content,
              createdAt: m.createdAt,
              isFlagged: m.isFlagged || false,
              flaggedBy: flaggedByGrouped
            };
          });

        return {
          userId: p._id,
          username: p.username,
          displayName: p.profile?.displayName,
          avatarUrl: p.profile?.avatarUrl,
          role: p.role,
          messages: userMessages
        };
      });

      return {
        _id: convo._id,
        type: convo.type,
        lastMessageAt: convo.lastMessageAt,
        messageCount: convo.messageCount || 0,
        participants: participantsData,
        memberStates: convo.memberStates.map(state => ({
          userId: state.userId,
          unreadCount: state.unreadCount,
          isUnderReview: state.isUnderReview
        }))
      };
    }));

    return res.status(200).json({
      message: 'Reported conversations fetched successfully',
      data: result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};