import mongoose, { Schema, Document } from 'mongoose';

export interface IFaza extends Document {
  title: string;
  description: string;
  communityId?: mongoose.Types.ObjectId;
}

const FazaSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  communityId: { type: Schema.Types.ObjectId, ref: 'Community' }
}, { timestamps: true });

export const Faza = mongoose.model<IFaza>('Faza', FazaSchema);
