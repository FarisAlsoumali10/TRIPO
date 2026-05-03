import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description?: string;
  date: Date;
  endDate?: Date;
  time?: string;
  locationName?: string;
  city?: string;
  category?: string;
  image?: string;
  coverImage?: string;
  isFree?: boolean;
  fee?: number;
  currency?: string;
  attendees?: mongoose.Types.ObjectId[];
  attendeesCount?: number;
  communityId?: mongoose.Types.ObjectId;
  color?: string;
  website?: string;
  hours?: string;
  gettingThere?: string;
  mapQuery?: string;
}

const EventSchema: Schema = new Schema({
  title:         { type: String, required: true },
  description:   { type: String },
  date:          { type: Date, required: true },
  endDate:       { type: Date },
  time:          { type: String },
  locationName:  { type: String },
  city:          { type: String },
  category:      { type: String },
  image:         { type: String },
  coverImage:    { type: String },
  isFree:        { type: Boolean, default: false },
  fee:           { type: Number, default: 0 },
  currency:      { type: String, default: 'SAR' },
  attendees:      { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  attendeesCount: { type: Number, default: 0 },
  communityId:   { type: Schema.Types.ObjectId, ref: 'Community' },
  color:         { type: String },
  website:       { type: String },
  hours:         { type: String },
  gettingThere:  { type: String },
  mapQuery:      { type: String },
}, { timestamps: true });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
