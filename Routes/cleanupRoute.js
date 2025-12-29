const express = require('express');
const router = express.Router();
const { removeDuplicateConversations } = require('../Controllers/cleanupController');
const auth = require('../middleware/authenticationMiddle');

// POST /api/admin/cleanup/duplicate-conversations
router.post('/duplicate-conversations', auth, removeDuplicateConversations);

module.exports = router;
