const express = require('express');
const router = express.Router();
const { getAllConversationsForAdmin, getReportedConversations } = require('../Controllers/ConversationController');
const authenticate = require('../middleware/authenticationMiddle'); // optional admin auth
const authorize = require('../middleware/authorizationMiddle'); // optional admin auth

// GET /api/conversations/admin
// Returns all conversations for admin with limited fields
router.get('/admin', authenticate, authorize('admin'), getAllConversationsForAdmin);
router.get('/admin/reported', authenticate, authorize('admin'), getReportedConversations);

module.exports = router;
