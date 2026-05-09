import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  communityId: string;
  community?: mongoose.Types.ObjectId;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  date: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  locationName?: string;
  mapUrl?: string;
  category?: string;
  coverPreset?: number;
  image?: string;
  maxAttendees?: number;
  minAttendees?: number;
  recurrence: 'once' | 'weekly' | 'monthly';
  isFree: boolean;
  fee?: number;
  price?: number;
  requirements?: string[];
  organizerNote?: string;
  organizer?: mongoose.Types.ObjectId;
  status: 'draft' | 'published';
  attendees: string[]; // userId[]
  createdBy: string;   // userId
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    communityId: { type: String, required: true, index: true },
    community: { type: Schema.Types.ObjectId, ref: 'Community' },
    title: { type: String, required: true, trim: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    date: { type: String, required: true },
    startDate: { type: String },
    endDate: { type: String },
    time: { type: String },
    endTime: { type: String },
    locationName: { type: String },
    mapUrl: { type: String },
    category: { type: String },
    coverPreset: { type: Number, default: 0 },
    image: { type: String },
    maxAttendees: { type: Number },
    minAttendees: { type: Number },
    recurrence: {
      type: String,
      enum: ['once', 'weekly', 'monthly'],
      default: 'once',
    },
    isFree: { type: Boolean, default: true },
    fee: { type: Number, default: 0 },
    price: { type: Number },
    requirements: { type: [String], default: [] },
    organizerNote: { type: String },
    organizer: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
    },
    attendees: { type: [String], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const Event = mongoose.model<IEvent>('Event', eventSchema);
