const express = require('express');
const router = express.Router();
const messageController = require('../Controllers/MessageController');
//const conversationController = require('../Controllers/');
const authenticate = require('../middleware/authenticationMiddle'); // ensures req.user

// Send a message (creates conversation if needed)
router.post('/', authenticate, messageController.sendMessage);
router.post('/:messageId/flag',authenticate, messageController.flagMessage);
module.exports = router;
