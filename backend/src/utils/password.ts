import bcrypt from 'bcryptjs';

// ✅ استخدام متغيرات البيئة للتحكم بقوة التشفير، مع رفع الحد الأدنى إلى 12 لحماية أقوى
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

/**
 * تشفير كلمة المرور باستخدام خوارزمية bcrypt
 * @param password كلمة المرور النصية الواضحة (Plain text)
 * @returns كلمة المرور المشفرة مع الـ Salt (Hash)
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!password) {
    throw new Error('Password is required for hashing');
  }
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * التحقق من صحة كلمة المرور ومقارنتها بالنسخة المشفرة في قاعدة البيانات
 * @param password كلمة المرور النصية المدخلة من المستخدم
 * @param hash النسخة المشفرة المحفوظة في قاعدة البيانات
 * @returns true إذا تطابقت، false إذا لم تتطابق
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  // ✅ حماية إضافية: إذا كانت إحدى القيم مفقودة، ارفض العملية فوراً بدلاً من تعليق السيرفر
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
};