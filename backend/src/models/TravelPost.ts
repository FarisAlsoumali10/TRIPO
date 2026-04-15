import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITravelPost extends Document {
  authorId: Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  placeName: string;
  placeId?: string;
  date: Date;
  groupSize: number;
  maxSize: number;
  description: string;
  interests: string[];
  joinedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const travelPostSchema = new Schema<ITravelPost>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    authorAvatar: { type: String },
    placeName: { type: String, required: true },
    placeId: { type: String },
    date: { type: Date, required: true },
    groupSize: { type: Number, required: true, min: 1 },
    maxSize: { type: Number, required: true, min: 2 },
    description: { type: String, required: true },
    interests: { type: [String], default: [] },
    joinedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export const TravelPost = mongoose.model<ITravelPost>('TravelPost', travelPostSchema);
