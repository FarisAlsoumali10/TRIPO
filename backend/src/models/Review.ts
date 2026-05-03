import mongoose, { Document, Schema, Types } from 'mongoose';
import { ReviewTargetType } from '../types';

export interface IReview extends Document {
  userId: Types.ObjectId;
  // ✅ توسيع أنواع الأهداف لتشمل المخيمات والجلسات التي أضفناها
  targetType: ReviewTargetType;
  targetId: Types.ObjectId;
  rating: number;
  title?: string;
  comment?: string;
  mediaRefs: string[];
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ✅ تسريع جلب "كل مراجعاتي" في الملف الشخصي
  },
  targetType: {
    type: String,
    enum: ['place', 'itinerary', 'campsite', 'session', 'rental', 'tour'],
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100 // ✅ حماية من العناوين الطويلة جداً
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000 // ✅ حماية قاعدة البيانات من النصوص الضخمة
  },
  mediaRefs: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// ==========================================
//  فهارس الأمان والأداء (Security & Performance Indexes)
// ==========================================

// 1. منع التكرار: لا يمكن للمستخدم تقييم نفس المكان/المخيم أكثر من مرة
reviewSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

// 2. الفهرس الذهبي: جلب تقييمات مكان معين مرتبة من الأحدث للأقدم بسرعة البرق
reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);