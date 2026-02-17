import mongoose, { Document, Schema, Types } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  payload: any;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['group_invitation', 'new_message', 'expense_added', 'member_joined', 'member_left'],
    required: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
