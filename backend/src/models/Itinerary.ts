import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStop {
  name: string;
  description?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface IItinerary extends Document {
  title: string;
  city: string;
  durationInMinutes: number;
  isPublic: boolean;
  stops: IStop[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StopSchema = new Schema<IStop>({
  name: { type: String, required: true },
  description: { type: String },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }
});

const ItinerarySchema = new Schema<IItinerary>(
  {
    title: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    durationInMinutes: { type: Number, required: true, min: 1 },
    isPublic: { type: Boolean, default: false },
    stops: [StopSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: true
  }
);

export const Itinerary = mongoose.model<IItinerary>('Itinerary', ItinerarySchema);
