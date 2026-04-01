import mongoose, { Document, Schema } from 'mongoose';
import { UserRole, Language, SmartProfile } from '../types';

// ✅ توسيع البروفايل الذكي ليكون أكثر دفئاً وتخصيصاً (Cozy Vibes)
export interface ISmartProfile extends SmartProfile {
  interests: string[];
  preferredBudget: 'free' | 'low' | 'medium' | 'high';
  activityStyles: string[];
  typicalFreeTimeWindow: number;
  mood?: string;
  city: string;
  travelVibe?: 'chill' | 'adventurous' | 'cultural' | 'foodie'; // جو الرحلة
  favoriteSeason?: 'winter' | 'spring' | 'summer' | 'autumn'; // الموسم المفضل
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  googleId?: string;
  facebookId?: string;
  name: string;
  bio?: string; // ✅ نبذة قصيرة أو اقتباس مفضل للمستخدم
  avatar?: string;
  role: UserRole | 'user' | 'admin' | 'host';
  language: Language | 'en' | 'ar';
  appTheme: 'light' | 'dark' | 'system'; // ✅ دعم الـ Dark Mode المريح للعين
  tripoPoints: number; // ✅ نظام نقاط لتشجيع المستخدمين (Gamification)
  explorerLevel: string; // ✅ لقب المستخدم (مثال: رحال مبتدئ، خبير كشتات)
  smartProfile: ISmartProfile;
  isEmailVerified: boolean; // ✅ لمسة أمنية احترافية
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const smartProfileSchema = new Schema({
  interests: { type: [String], default: [] },
  preferredBudget: {
    type: String,
    enum: ['free', 'low', 'medium', 'high'],
    default: 'medium'
  },
  activityStyles: { type: [String], default: [] },
  typicalFreeTimeWindow: { type: Number, default: 180 }, // بالدقائق
  mood: { type: String },
  city: { type: String, required: false, default: '' },
  travelVibe: {
    type: String,
    enum: ['chill', 'adventurous', 'cultural', 'foodie'],
    default: 'chill'
  },
  favoriteSeason: {
    type: String,
    enum: ['winter', 'spring', 'summer', 'autumn']
  }
}, { _id: false });

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: false,
    default: null
  },
  googleId: {
    type: String,
    sparse: true,
    index: true
  },
  facebookId: {
    type: String,
    sparse: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 150 // بايو خفيف ولطيف
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'host'],
    default: 'user'
  },
  language: {
    type: String,
    enum: ['en', 'ar'],
    default: 'en'
  },
  appTheme: {
    type: String,
    enum: ['light', 'dark', 'system'],
    default: 'system'
  },
  tripoPoints: {
    type: Number,
    default: 0 // تبدأ رحلة جمع النقاط من الصفر!
  },
  explorerLevel: {
    type: String,
    default: 'Newcomer' // القادم الجديد
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastActiveAt: {
    type: Date
  },
  smartProfile: {
    type: smartProfileSchema,
    required: false
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);