import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IJournalDay {
  dayNumber: number;
  date?: string;
  title?: string;
  notes: string;
  photos: string[];
  places: string[];
  mood?: string;
}

export interface ITripJournal extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  tripId?: Types.ObjectId;
  coverPhoto?: string;
  visibility: 'public' | 'private' | 'friends' | 'link';
  shareToken?: string;
  days: IJournalDay[];
  tags: string[];
  startDate?: string;
  endDate?: string;
  city?: string;
  createdAt: Date;
  updatedAt: Date;
}

const journalDaySchema = new Schema({
  dayNumber: { type: Number, required: true },
  date:      { type: String },
  title:     { type: String },
  notes:     { type: String, default: '' },
  photos:    { type: [String], default: [] },
  places:    { type: [String], default: [] },
  mood:      { type: String },
}, { _id: false });

const tripJournalSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  tripId: { type: Schema.Types.ObjectId, ref: 'GroupTrip' },
  coverPhoto: { type: String },
  visibility: {
    type: String,
    enum: ['public', 'private', 'friends', 'link'],
    default: 'private',
    index: true
  },
  shareToken: { type: String, unique: true, sparse: true },
  days: { type: [journalDaySchema], default: [] },
  tags: { type: [String], default: [] },
  startDate: { type: String },
  endDate:   { type: String },
  city:      { type: String },
}, { timestamps: true });

export const TripJournal = mongoose.model<ITripJournal>('TripJournal', tripJournalSchema);
