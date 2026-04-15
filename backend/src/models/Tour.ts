import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITourStop {
  order: number;
  placeName: string;
  duration: number; // minutes
  description: string;
  timeSlot?: string;
  image?: string;
}

export interface ITour extends Document {
  title: string;
  slug: string;
  description: string;
  highlights: string[];
  heroImage: string;
  images: string[];
  pricePerPerson: number;
  currency: 'SAR';
  maxGroupSize: number;
  minGroupSize: number;
  baseItineraryId?: Types.ObjectId;
  stops: ITourStop[];
  departureLocation: string;
  departureTime: string;
  returnTime?: string;
  totalDuration: number; // hours
  difficulty: 'easy' | 'moderate' | 'challenging';
  included: string[];
  excluded: string[];
  guideName: string;
  guideAvatar?: string;
  guideRating?: number;
  availableDates: Date[];
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  bookingsCount: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const tourStopSchema = new Schema<ITourStop>(
  {
    order: { type: Number, required: true },
    placeName: { type: String, required: true, trim: true },
    duration: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    timeSlot: { type: String, trim: true },
    image: { type: String },
  },
  { _id: false }
);

const tourSchema = new Schema<ITour>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    highlights: { type: [String], default: [] },
    heroImage: { type: String },
    images: { type: [String], default: [] },
    pricePerPerson: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['SAR'], default: 'SAR' },
    maxGroupSize: { type: Number, required: true, min: 1 },
    minGroupSize: { type: Number, default: 1 },
    baseItineraryId: { type: Schema.Types.ObjectId, ref: 'Itinerary' },
    stops: { type: [tourStopSchema], default: [] },
    departureLocation: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true },
    returnTime: { type: String },
    totalDuration: { type: Number, required: true }, // hours
    difficulty: {
      type: String,
      enum: ['easy', 'moderate', 'challenging'],
      required: true,
    },
    included: { type: [String], default: [] },
    excluded: { type: [String], default: [] },
    guideName: { type: String, required: true, trim: true },
    guideAvatar: { type: String },
    guideRating: { type: Number, min: 0, max: 5, default: 4.8 },
    availableDates: { type: [Date], default: [] },
    category: { type: String, required: true, trim: true, index: true },
    tags: { type: [String], default: [] },
    rating: { type: Number, default: 4.7, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    bookingsCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

tourSchema.index({ status: 1, category: 1 });

// Auto-generate slug from title if not provided
tourSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80) + '-' + Date.now();
  }
  next();
});

export const Tour = mongoose.model<ITour>('Tour', tourSchema);
