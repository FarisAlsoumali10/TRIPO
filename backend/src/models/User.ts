import mongoose, { Document, Schema } from 'mongoose';
import { UserRole, Language, SmartProfile } from '../types';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  avatar?: string;
  role: UserRole;
  language: Language;
  smartProfile: SmartProfile;
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
  typicalFreeTimeWindow: { type: Number, default: 180 }, // minutes
  mood: { type: String },
  city: { type: String, required: true }
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
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
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
  smartProfile: {
    type: smartProfileSchema,
    required: true
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema);
