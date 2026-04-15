import mongoose, { Schema, Document } from 'mongoose';

export interface IRental extends Document {
  title: string;
  price: number;
  capacity: number;
  locationName: string;
  city: string;
  image: string;
  rating?: number;
}

const RentalSchema: Schema = new Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  locationName: { type: String, required: true },
  city: { type: String, required: true },
  image: { type: String, required: true },
  rating: { type: Number, default: 0 }
}, { timestamps: true });

export const Rental = mongoose.model<IRental>('Rental', RentalSchema);
