import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

/**
 * هيكل البيانات المشفرة داخل التوكن
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ✅ حماية قصوى: منع تشغيل السيرفر في الإنتاج بدون مفتاح سري حقيقي
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('❌ FATAL ERROR: JWT_SECRET is not defined in environment variables!');
}

// الاكتفاء بمفتاح ضعيف فقط في بيئة التطوير المحلية
const SECRET_KEY = JWT_SECRET || 'dev-secret-key-12345';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * توليد رمز وصول (Token) جديد للمستخدم
 */
export const generateToken = (payload: JwtPayload): string => {
  try {
    // استخدام خوارزمية HS256 بشكل افتراضي
    return jwt.sign(payload, SECRET_KEY, {
      expiresIn: JWT_EXPIRES_IN as any,
      algorithm: 'HS256'
    });
  } catch (error) {
    console.error('❌ Error generating JWT:', error);
    throw new Error('Failed to generate authentication token');
  }
};

/**
 * التحقق من صحة الرمز واستخراج البيانات منه
 * @throws {TokenExpiredError} إذا انتهت صلاحية الرمز
 * @throws {JsonWebTokenError} إذا كان الرمز غير صحيح أو تم التلاعب به
 */
export const verifyToken = (token: string): JwtPayload => {
  // ✅ نترك الأخطاء تخرج كما هي لكي يتعامل معها الـ Middleware (مثل التمييز بين Expired و Invalid)
  return jwt.verify(token, SECRET_KEY) as JwtPayload;
};