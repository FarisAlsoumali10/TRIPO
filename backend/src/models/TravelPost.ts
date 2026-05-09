import mongoose, { Document, Schema } from 'mongoose';

export interface ITravelPost extends Document {
  communityId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  placeName: string;
  placeId?: string;
  date: string; // ISO date string "YYYY-MM-DD"
  maxGroupSize: number;
  description?: string;
  interests: string[];
  members: string[]; // userId[]
  createdAt: Date;
  updatedAt: Date;
}

const travelPostSchema = new Schema<ITravelPost>(
  {
    communityId: { type: String, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    placeName: { type: String, required: true, trim: true },
    placeId: { type: String },
    date: { type: String, required: true },
    maxGroupSize: { type: Number, required: true, min: 2, max: 20, default: 4 },
    description: { type: String, trim: true },
    interests: { type: [String], default: [] },
    members: { type: [String], default: [] }, // populated with userId on join
  },
  { timestamps: true }
);

export const TravelPost = mongoose.model<ITravelPost>(
  'TravelPost',
  travelPostSchema
);
