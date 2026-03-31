import mongoose, { Document, Schema, Types } from 'mongoose';
import { MarketplaceTargetType, BookingStatus } from '../types';

export interface IBooking extends Document {
  userId: Types.ObjectId;
  targetType: MarketplaceTargetType | 'session' | 'campsite' | 'tour';
  targetId: Types.ObjectId;
  status: BookingStatus | 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded'; // ✅ إضافة حالة الدفع
  totalPrice: number; // ✅ فصل السعر الإجمالي لسهولة الإحصائيات
  bookingDetails: any;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ✅ فهرس لتسريع جلب حجوزات المستخدم
  },
  targetType: {
    type: String,
    enum: ['session', 'campsite', 'tour'],
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true // ✅ فهرس لتسريع التحقق من توفر المكان
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0
  },
  bookingDetails: {
    type: Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

// ✅ فهرس مركب (Compound Index) لتسريع استعلام "الحجوزات المؤكدة لمكان معين"
bookingSchema.index({ targetId: 1, status: 1 });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);