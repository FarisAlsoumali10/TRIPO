import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunity extends Document {
  name: string;
  icon: string;
  memberCount: number;
  description: string;
  members: mongoose.Types.ObjectId[];
  subscribers: mongoose.Types.ObjectId[];
}

const CommunitySchema: Schema = new Schema({
  name:        { type: String, required: true },
  icon:        { type: String, required: true },
  memberCount: { type: Number, default: 0 },
  description: { type: String, required: true },
  members:     [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  subscribers: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
}, { timestamps: true });

export const Community = mongoose.model<ICommunity>('Community', CommunitySchema);
