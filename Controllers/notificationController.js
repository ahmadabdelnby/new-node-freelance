const Notification = require('../Models/notification');

const createNotification = async (userId, type, content, linkUrl = '') => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      content,
      linkUrl
    });
    return notification;
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
  }
};

const getUserNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.findOneAndDelete({
      _id: id,
      user: req.user._id
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { 
        $set: { 
          isRead: true,
          readAt: new Date()
        } 
      }
    );

    res.status(200).json({ 
      success: true, 
      message: 'All notifications marked as read',
      updatedCount: result.modifiedCount
    });
  } catch (err) {
    next(err);
  }
};

// Get unread count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.status(200).json({ 
      success: true, 
      unreadCount: count
    });
  } catch (err) {
    next(err);
  }
};

// Delete all notifications
const deleteAllNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id
    });

    res.status(200).json({ 
      success: true, 
      message: 'All notifications deleted',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  deleteNotification,
  markAllAsRead,
  getUnreadCount,
  deleteAllNotifications
};
