import mongoose, { Document, Schema, Types } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  userId: Types.ObjectId;
  // ✅ توسيع الأنواع لتشمل الحجوزات وتنبيهات النظام
  type: NotificationType | 'group_invitation' | 'new_message' | 'expense_added' | 'member_joined' | 'member_left' | 'booking_status' | 'system_alert' | 'payment_received' | 'refund_issued' | 'payment_failed' | 'booking_cancelled' | 'payout_credited' | 'payout_requested';
  payload: any;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // تمت إزالة الفهرس المفرد من هنا لصالح الفهرس المركب بالأسفل
  },
  type: {
    type: String,
    enum: ['group_invitation', 'new_message', 'expense_added', 'member_joined', 'member_left', 'booking_status', 'system_alert', 'new_booking', 'new_booking_tour', 'new_reply', 'new_joiner', 'new_review', 'payment_received', 'refund_issued', 'payment_failed', 'booking_cancelled', 'payout_credited', 'payout_requested'],
    required: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  read: {
    type: Boolean,
    default: false
    // تمت إزالة الفهرس المفرد من هنا لصالح الفهرس المركب بالأسفل
  }
}, {
  timestamps: true
});

// ==========================================
//  فهارس الأداء العالي (High-Performance Indexes)
// ==========================================

// 1. الفهرس المركب: تسريع جلب الإشعارات (المقروءة/الغير مقروءة) لمستخدم معين مرتبة زمنياً
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// 2. التنظيف التلقائي (TTL Index): حذف الإشعارات الأقدم من 60 يوماً لتوفير مساحة السيرفر
// 60 يوماً = 60 * 24 * 60 * 60 = 5184000 ثانية
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);