const express = require('express');
const router = express.Router();
const {
    createOrGetConversation,
    getMyConversations,
    sendMessage,
    getConversationMessages,
    markAsRead,
    deleteMessage,
    editMessage,
    markAllMessagesAsRead,
    getUnreadCount,
    archiveConversation
} = require('../Controllers/chatController');
const authenticate = require('../middleware/authenticationMiddle');

/**
 * @swagger
 * /Freelancing/api/v1/chat/conversation:
 *   post:
 *     summary: Create or get conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participantId:
 *                 type: string
 *               jobId:
 *                 type: string
 *               proposalId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 */
router.post('/conversation', authenticate, createOrGetConversation);

/**
 * @swagger
 * /Freelancing/api/v1/chat/conversations:
 *   get:
 *     summary: Get user's conversations
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 */
router.get('/conversations', authenticate, getMyConversations);

/**
 * @swagger
 * /Freelancing/api/v1/chat/message:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post('/message', authenticate, sendMessage);

/**
 * @swagger
 * /Freelancing/api/v1/chat/conversation/{conversationId}/messages:
 *   get:
 *     summary: Get conversation messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 */
router.get('/conversation/:conversationId/messages', authenticate, getConversationMessages);

/**
 * @swagger
 * /Freelancing/api/v1/chat/message/{messageId}/read:
 *   patch:
 *     summary: Mark message as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read
 */
router.patch('/message/:messageId/read', authenticate, markAsRead);

/**
 * @swagger
 * /Freelancing/api/v1/chat/message/{messageId}:
 *   delete:
 *     summary: Delete message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted successfully
 */
router.delete('/message/:messageId', authenticate, deleteMessage);

/**
 * @swagger
 * /Freelancing/api/v1/chat/message/{messageId}/edit:
 *   patch:
 *     summary: Edit message (within 5 minutes)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message edited successfully
 */
router.patch('/message/:messageId/edit', authenticate, editMessage);

/**
 * @swagger
 * /Freelancing/api/v1/chat/conversation/{conversationId}/read-all:
 *   patch:
 *     summary: Mark all messages in conversation as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All messages marked as read
 */
router.patch('/conversation/:conversationId/read-all', authenticate, markAllMessagesAsRead);

/**
 * @swagger
 * /Freelancing/api/v1/chat/unread-count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 */
router.get('/unread-count', authenticate, getUnreadCount);

/**
 * @swagger
 * /Freelancing/api/v1/chat/conversation/{conversationId}/archive:
 *   patch:
 *     summary: Archive/unarchive conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation archived/unarchived successfully
 */
router.patch('/conversation/:conversationId/archive', authenticate, archiveConversation);

module.exports = router;
