import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

// ✅ استخدام AnyZodObject لضمان أننا نستقبل Object دائماً في الـ Body
export const validate = (schema: AnyZodObject | ZodEffects<AnyZodObject>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ✅ Zod هنا سيقوم بوظيفتين:
      // 1. التحقق من صحة البيانات.
      // 2. حذف أي خصائص خبيثة أو غير متوقعة أرسلها الهاكر ولم تذكر في الـ Schema.
      req.body = await schema.parseAsync(req.body);

      next();
    } catch (error) {
      // ✅ تمرير الخطأ مباشرة إلى الـ errorHandler الذي برمجناه للتو ليتعامل معه باحترافية
      next(error);
    }
  };
};