const express = require('express');
const authenticate = require('../middleware/authenticationMiddle')
const {
  getUserNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead,
  getUnreadCount,
  deleteAllNotifications
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', authenticate, getUserNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/mark-all-read', authenticate, markAllAsRead);
router.put('/:id/read', authenticate, markAsRead);
router.delete('/delete-all', authenticate, deleteAllNotifications);
router.delete('/:id', authenticate, deleteNotification);

module.exports = router;