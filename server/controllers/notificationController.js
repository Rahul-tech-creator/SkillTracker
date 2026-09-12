const Notification = require('../models/Notification');
const timeService = require('../utils/timeService');

/**
 * GET /api/notifications/my
 * Returns notifications for the authenticated user
 */
const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('followUpId')
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      status: { $in: ['PENDING', 'SENT'] },
    });

    res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as READ
 */
const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    notification.status = 'READ';
    notification.readAt = await timeService.getCurrentDate();
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for current user as READ
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    const logicalNow = await timeService.getCurrentDate();
    await Notification.updateMany(
      { userId: req.user._id, status: { $in: ['PENDING', 'SENT'] } },
      { status: 'READ', readAt: logicalNow }
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
