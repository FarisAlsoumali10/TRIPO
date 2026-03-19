import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthRequest } from '../types';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ استخدام Optional Chaining لكود أنظف وأكثر أماناً
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'لم يتم تقديم رمز المصادقة (Token).' });
    }

    const token = authHeader.split(' ')[1];

    // ✅ التأكد من عدم إرسال مسافة فارغة بدلاً من التوكن
    if (!token) {
      return res.status(401).json({ error: 'رمز المصادقة فارغ.' });
    }

    const decoded = verifyToken(token);

    req.user = decoded as any; // (يفضل استبدال any بالواجهة الخاصة ببيانات المستخدم)
    next();
  } catch (error: any) {
    // ✅ تحسين تجربة المستخدم: التمييز بين انتهاء الجلسة والتوكن غير الصالح
    const isExpired = error.name === 'TokenExpiredError';
    const message = isExpired
      ? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.'
      : 'رمز المصادقة غير صالح أو تم التلاعب به.';

    return res.status(401).json({
      error: message,
      isExpired // هذا الحقل سيساعد الفرونت-إند على توجيه المستخدم لصفحة تسجيل الدخول فوراً
    });
  }
};