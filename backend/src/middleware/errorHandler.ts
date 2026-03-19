import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // ✅ طباعة احترافية للخطأ في الـ Terminal مع تحديد المسار الذي حدث فيه
  console.error(`❌ [Error] ${req.method} ${req.originalUrl} >>`, error.message || error);

  let statusCode = error.statusCode || 500;
  let errorMessage = error.message || 'Internal server error';
  let errorDetails: any = null;

  // 1. أخطاء التحقق من الواجهة (Zod Validation)
  if (error instanceof ZodError) {
    statusCode = 400;
    errorMessage = 'Validation error';
    errorDetails = error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }
  // 2. أخطاء التحقق من قاعدة البيانات (Mongoose Validation)
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorMessage = 'Database validation error';
    // ✅ تحويل أخطاء مونجوس إلى مصفوفة نظيفة يسهل قراءتها
    errorDetails = Object.values(error.errors || {}).map((err: any) => ({
      field: err.path,
      message: err.message
    }));
  }
  // 3. أخطاء الـ ID غير الصالح (Mongoose CastError)
  else if (error.name === 'CastError') {
    statusCode = 400;
    errorMessage = `Invalid format for ${error.path}: ${error.value}`;
  }
  // 4. أخطاء التكرار في قاعدة البيانات (MongoDB Duplicate Key - 11000)
  else if (error.code === 11000) {
    statusCode = 409;
    errorMessage = 'Duplicate entry';
    // ✅ التقاط اسم الحقل المكرر ديناميكياً (مثلاً: email)
    const field = Object.keys(error.keyValue || {})[0];
    errorDetails = `A record with this ${field || 'value'} already exists.`;
  }

  // ✅ إرسال رد موحد ومنظم للواجهة الأمامية
  return res.status(statusCode).json({
    success: false,
    error: errorMessage,
    ...(errorDetails && { details: errorDetails }),
    // ✅ إخفاء الـ Stack Trace في بيئة الإنتاج لدواعي أمنية
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

export const notFound = (req: Request, res: Response) => {
  // ✅ إخبار الواجهة الأمامية بالمسار الذي حاول المستخدم الدخول إليه
  res.status(404).json({
    success: false,
    error: `Route not found - ${req.originalUrl}`
  });
};