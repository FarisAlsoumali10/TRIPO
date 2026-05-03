import mongoose, { Document, Schema, Types } from 'mongoose';
import { MessageType } from '../types';

export interface IMessage extends Document {
  groupTripId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  // ✅ توسيع أنواع الرسائل لتناسب تطبيق رحلات
  type: MessageType | 'text' | 'system' | 'image' | 'location' | 'audio' | 'video';
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema({
  groupTripId: {
    type: Schema.Types.ObjectId,
    ref: 'GroupTrip',
    required: true
    // تمت إزالة الفهرس المفرد من هنا لنستبدله بالفهرس المركب بالأسفل
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ✅ لتسريع جلب "الرسائل التي أرسلها هذا المستخدم" إذا احتجنا
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'system', 'image', 'location', 'audio', 'video'],
    default: 'text'
  }
}, {
  timestamps: true
});

// ✅ الفهرس السحري: تسريع جلب رسائل رحلة معينة مرتبة زمنياً (حرفياً سيطير التطبيق)
messageSchema.index({ groupTripId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);