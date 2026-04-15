import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunity extends Document {
  name: string;
  icon: string;
  memberCount: number;
  description: string;
}

const CommunitySchema: Schema = new Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true },
  memberCount: { type: Number, default: 0 },
  description: { type: String, required: true }
}, { timestamps: true });

export const Community = mongoose.model<ICommunity>('Community', CommunitySchema);
