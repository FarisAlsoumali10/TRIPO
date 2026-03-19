import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IExpense extends Document {
  groupTripId: Types.ObjectId;
  payerId: Types.ObjectId;
  amount: number;
  currency: string; // ✅ العملة
  category: string; // ✅ تصنيف المصروف لعمل إحصائيات لاحقاً
  description: string;
  splitType: 'equal' | 'percentage' | 'exact'; // ✅ طريقة التقسيم
  receiptUrl?: string; // ✅ إرفاق صورة الفاتورة (اختياري)
  involvedMemberIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
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
    required: true,
    index: true // ✅ فهرس لمعرفة كل ما دفعه مستخدم معين بسرعة
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'SAR' // افتراضياً الريال السعودي
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'accommodation', 'activities', 'shopping', 'other'],
    default: 'other'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'percentage', 'exact'],
    default: 'equal' // التقسيم بالتساوي كخيار افتراضي
  },
  receiptUrl: {
    type: String // رابط صورة الفاتورة إن وُجدت
  },
  involvedMemberIds: {
    type: [Schema.Types.ObjectId],
    ref: 'User',
    required: true,
    validate: {
      validator: (members: Types.ObjectId[]) => members.length > 0,
      message: 'يجب أن يشمل المصروف عضواً واحداً على الأقل'
    }
  }
}, {
  timestamps: true
});

// ✅ فهرس مركب لتسريع جلب المصاريف لرحلة معينة مرتبة زمنياً
expenseSchema.index({ groupTripId: 1, createdAt: -1 });

export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);