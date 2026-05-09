import mongoose, { Document, Schema } from 'mongoose';

export interface IReply {
  _id?: string;
  text: string;
  authorName: string;
  userId: string;
  createdAt: string;
  imageUrl?: string;
}

export interface IPoll {
  question: string;
  options: string[];
  votes: Map<string, number>; // userId → optionIndex
}

export interface IMajlisThread extends Document {
  communityId: string;
  title: string;
  body?: string;
  authorName: string;
  userId: string;
  tags: string[];
  imageUrl?: string;
  pinned: boolean;
  replies: IReply[];
  reactions: Map<string, string[]>; // emoji → userId[]
  poll?: IPoll;
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IReply>(
  {
    text: { type: String, required: true },
    authorName: { type: String, required: true },
    userId: { type: String, required: true },
    imageUrl: { type: String },
  },
  { timestamps: true, _id: true }
);

const pollSchema = new Schema<IPoll>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true },
    votes: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const majlisThreadSchema = new Schema<IMajlisThread>(
  {
    communityId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true },
    authorName: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    imageUrl: { type: String },
    pinned: { type: Boolean, default: false },
    replies: { type: [replySchema], default: [] },
    reactions: { type: Map, of: [String], default: {} },
    poll: { type: pollSchema, default: undefined },
  },
  { timestamps: true }
);

export const MajlisThread = mongoose.model<IMajlisThread>(
  'MajlisThread',
  majlisThreadSchema
);
