import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunity extends Document {
  name: string;
  nameAr?: string;
  slug?: string;
  icon: string;
  image?: string;
  coverImage?: string;
  memberCount: number;
  description: string;
  descriptionAr?: string;
  category?: string;
  tags?: string[];
  isVerified?: boolean;
  isPublic?: boolean;
  rules?: string[];
  stats?: {
    postsCount: number;
    activeMembersThisMonth: number;
    weeklyGrowth: number;
  };
  recentPosts?: {
    image: string;
    caption: string;
    likes: number;
    commentsCount: number;
  }[];
  creator?: mongoose.Types.ObjectId;
  admins?: mongoose.Types.ObjectId[];
  members: mongoose.Types.ObjectId[];
  subscribers: mongoose.Types.ObjectId[];
  isOfficial?: boolean;
  city?: string;
}

const CommunitySchema: Schema = new Schema({
  name:        { type: String, required: true },
  nameAr:      { type: String },
  slug:        { type: String, unique: true, sparse: true },
  icon:        { type: String, required: false },
  image:       { type: String },
  coverImage:  { type: String },
  memberCount: { type: Number, default: 0 },
  description: { type: String, required: true },
  descriptionAr: { type: String },
  category:    { type: String },
  tags:        [{ type: String }],
  isVerified:  { type: Boolean, default: false },
  isPublic:    { type: Boolean, default: true },
  rules:       [{ type: String }],
  stats: {
    postsCount: { type: Number, default: 0 },
    activeMembersThisMonth: { type: Number, default: 0 },
    weeklyGrowth: { type: Number, default: 0 }
  },
  recentPosts: [{
    image: { type: String },
    caption: { type: String },
    likes: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 }
  }],
  creator:     { type: Schema.Types.ObjectId, ref: 'User' },
  admins:      [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  members:     [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  subscribers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  isOfficial:  { type: Boolean, default: false },
  city:        { type: String },
}, { timestamps: true });

export const Community = mongoose.model<ICommunity>('Community', CommunitySchema);
