import mongoose, { Document, Schema, Types } from 'mongoose';
import { ItineraryStatus, RatingSummary, PlaceInItinerary } from '../types';

export interface IItinerary extends Document {
  userId: Types.ObjectId;
  title: string;
  status: ItineraryStatus;
  estimatedDuration: number;
  estimatedCost: number;
  distance: number;
  city: string;
  places: PlaceInItinerary[];
  notes?: string;
  isVerified: boolean;
  ratingSummary: RatingSummary;
  createdAt: Date;
  updatedAt: Date;
}

const placeInItinerarySchema = new Schema({
  placeId: {
    type: Schema.Types.ObjectId,
    ref: 'Place',
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  timeSlot: {
    type: String
  },
  notes: {
    type: String
  }
}, { _id: false });

const itinerarySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  estimatedDuration: {
    type: Number,
    required: true
  },
  estimatedCost: {
    type: Number,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  city: {
    type: String,
    required: true,
    index: true
  },
  places: {
    type: [placeInItinerarySchema],
    validate: {
      validator: (places: PlaceInItinerary[]) => places.length > 0,
      message: 'Itinerary must have at least one place'
    }
  },
  notes: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  ratingSummary: {
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

export const Itinerary = mongoose.model<IItinerary>('Itinerary', itinerarySchema);
