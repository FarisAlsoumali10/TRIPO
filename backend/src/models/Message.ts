import mongoose, { Document, Schema, Types } from 'mongoose';
import { MessageType } from '../types';

export interface IMessage extends Document {
  groupTripId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  type: MessageType;
  createdAt: Date;
}

const messageSchema = new Schema({
  groupTripId: {
    type: Schema.Types.ObjectId,
    ref: 'GroupTrip',
    required: true,
    index: true
  },
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'system'],
    default: 'text'
  }
}, {
  timestamps: true
});

export const Message = mongoose.model<IMessage>('Message', messageSchema);
