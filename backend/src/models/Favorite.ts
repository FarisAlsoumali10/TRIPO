import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFavorite extends Document {
  userId: Types.ObjectId;
  placeId: Types.ObjectId;
  collectionName: string; // ✅ لإنشاء قوائم متعددة (Wishlists)
  notes?: string;         // ✅ ملاحظات شخصية للمستخدم عن هذا المكان
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ✅ تسريع جلب مفضلة المستخدم
  },
  placeId: {
    type: Schema.Types.ObjectId,
    ref: 'Place',
    required: true
  },
  collectionName: {
    type: String,
    default: 'المفضلة العامة', // القائمة الافتراضية
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500 // حماية قاعدة البيانات من النصوص الطويلة جداً
  }
}, {
  timestamps: true
});

// ✅ الفهرس الرائع الذي كتبته أنت لمنع التكرار (المكان يضاف مرة واحدة فقط للمستخدم)
favoriteSchema.index({ userId: 1, placeId: 1 }, { unique: true });

// ✅ فهرس مركب لتسريع جلب القائمة مرتبة من الأحدث للأقدم (كما طلب الـ Controller)
favoriteSchema.index({ userId: 1, createdAt: -1 });

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);