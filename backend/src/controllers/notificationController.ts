import { Response } from 'express';
import { AuthRequest } from '../types';
import { Notification } from '../models';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: req.user?.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error: any) {
    console.error('❌ Error in getNotifications:', error);
    // ✅ منع تعليق الواجهة
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الإشعارات' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      userId: req.user?.userId
    });

    if (!notification) {
      return res.status(404).json({ error: 'الإشعار غير موجود' });
    }

    notification.read = true;
    await notification.save();

    res.json(notification);
  } catch (error: any) {
    console.error('❌ Error in markAsRead:', error);
    // ✅ منع تعليق الواجهة
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة الإشعار' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany(
      { userId: req.user?.userId, read: false },
      { read: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('❌ Error in markAllAsRead:', error);
    // ✅ منع تعليق الواجهة
    res.status(500).json({ error: 'حدث خطأ أثناء تحديد جميع الإشعارات كمقروءة' });
  }
};