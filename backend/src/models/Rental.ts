import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRental extends Document {
  title: string;
  price: number;
  capacity?: number;
  locationName: string;
  mapsUrl?: string;
  city?: string;
  type?: string;
  description?: string;
  phone?: string;
  amenities?: string[];
  image?: string;
  images?: string[];
  active: boolean;
  hostId?: Types.ObjectId;
  rating?: number;
  ratingSummary: { avgRating: number; reviewCount: number };
  cleaningFee?: number;
  serviceFee?: number;
  contactPhone?: string;
  contactWhatsapp?: string;
  isTrending?: boolean;
}

const RentalSchema: Schema = new Schema({
  title:        { type: String, required: true },
  price:            { type: Number, required: true },
  commissionRate:   { type: Number, min: 0, max: 1 },  // overrides PLATFORM_FEE_RATE when set
  capacity:     { type: Number },
  locationName: { type: String, required: true },
  mapsUrl:      { type: String },
  city:         { type: String },
  type:         { type: String },
  description:  { type: String },
  phone:        { type: String },
  amenities:    [{ type: String }],
  image:        { type: String },
  images:       [{ type: String }],
  active:       { type: Boolean, default: true, index: true },
  hostId:       { type: Schema.Types.ObjectId, ref: 'User', index: true },
  rating:       { type: Number, default: 0 },
  ratingSummary: {
    avgRating:   { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  cleaningFee:       { type: Number },
  serviceFee:        { type: Number },
  contactPhone:      { type: String },
  contactWhatsapp:   { type: String },
  isTrending:        { type: Boolean, default: false },
}, { timestamps: true });

export const Rental = mongoose.model<IRental>('Rental', RentalSchema);
