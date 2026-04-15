import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReply {
  _id: Types.ObjectId;
  text: string;
  authorId: Types.ObjectId;
  authorName: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface IPoll {
  question: string;
  options: string[];
  // Map of userId string to option index
  votes: Map<string, number>; 
}

export interface IThread extends Document {
  communityId: Types.ObjectId;
  title: string;
  body: string;
  authorId: Types.ObjectId;
  authorName: string;
  imageUrl?: string;
  tags: string[];
  pinned: boolean;
  replies: IReply[];
  poll?: IPoll;
  // Map of emoji string to array of userIds
  reactions: Map<string, string[]>; 
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema = new Schema<IReply>({
  text: { type: String, required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  imageUrl: { type: String },
}, { timestamps: true });

const PollSchema = new Schema<IPoll>({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  votes: { type: Map, of: Number, default: new Map() }
}, { _id: false });

const ThreadSchema = new Schema<IThread>({
  communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
  title: { type: String, required: true },
  body: { type: String },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  imageUrl: { type: String },
  tags: [{ type: String }],
  pinned: { type: Boolean, default: false },
  replies: [ReplySchema],
  poll: { type: PollSchema },
  reactions: { type: Map, of: [String], default: new Map() }
}, { timestamps: true });

export const Thread = mongoose.model<IThread>('Thread', ThreadSchema);
