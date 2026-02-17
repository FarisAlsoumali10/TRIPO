import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IExpense extends Document {
  groupTripId: Types.ObjectId;
  payerId: Types.ObjectId;
  amount: number;
  description: string;
  involvedMemberIds: Types.ObjectId[];
  createdAt: Date;
}

const expenseSchema = new Schema({
  groupTripId: {
    type: Schema.Types.ObjectId,
    ref: 'GroupTrip',
    required: true,
    index: true
  },
  payerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  involvedMemberIds: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    required: true,
    validate: {
      validator: (members: Types.ObjectId[]) => members.length > 0,
      message: 'Expense must involve at least one member'
    }
  }
}, {
  timestamps: true
});

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
