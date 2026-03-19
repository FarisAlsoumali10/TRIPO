import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ استخدام Optional Chaining لحماية السيرفر إذا لم يتم إرسال الهيدر
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'لم يتم تقديم رمز المصادقة (Token)' });
    }

    // ✅ استخدام split بدلاً من substring لضمان التقاط التوكن فقط حتى لو كان هناك مسافات زائدة
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'رمز المصادقة فارغ' });
    }

    const payload = verifyToken(token);
    req.user = payload as any; // يمكنك استبدال any بالـ Type الفعلي للـ Payload

    next();
  } catch (error: any) {
    // ✅ تحسين تجربة المستخدم: التمييز بين انتهاء الجلسة والتوكن غير الصالح
    const isExpired = error.name === 'TokenExpiredError';
    const message = isExpired
      ? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً'
      : 'رمز المصادقة غير صالح أو تم التلاعب به';

    return res.status(401).json({
      error: message,
      isExpired // لكي يتمكن الفرونت-إند من قراءتها وطرد المستخدم لشاشة الدخول تلقائياً
    });
  }
};

// ✅ تحسين الأداء (Optimization): استخدام Set للبحث اللحظي O(1) بدلاً من Array.includes O(N)
export const requireRole = (...allowedRoles: string[]) => {
  const rolesSet = new Set(allowedRoles); // يتم إنشاؤها في الذاكرة مرة واحدة فقط

  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'يجب المصادقة أولاً للوصول لهذا المسار' });
    }

    // ✅ الفحص اللحظي للصلاحية
    if (!rolesSet.has(req.user.role)) {
      return res.status(403).json({ error: 'عذراً، لا تملك الصلاحيات الكافية للقيام بهذا الإجراء' });
    }

    next();
  };
};