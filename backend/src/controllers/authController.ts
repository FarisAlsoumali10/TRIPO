import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../types';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, language, smartProfile } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email,
      passwordHash,
      name,
      language,
      smartProfile
    });

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        smartProfile: user.smartProfile
      }
    });
  } catch (error: any) {
    console.error('❌ Error in register:', error);
    // ✅ إرجاع رد واضح للواجهة بدلاً من تعليق السيرفر
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم أثناء إنشاء الحساب' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // ✅ الرد بالشكل الذي تتوقعه الواجهة الأمامية الجديدة
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        language: user.language,
        smartProfile: user.smartProfile,
        avatar: user.avatar
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // TODO: Implement email sending logic
    // For now, just return success
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error: any) {
    console.error('❌ Error in requestPasswordReset:', error);
    res.status(500).json({ error: 'فشل في إرسال طلب استعادة كلمة المرور' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // TODO: Implement token validation and password reset logic
    // For now, just return success
    res.json({ message: 'Password reset successful' });
  } catch (error: any) {
    console.error('❌ Error in resetPassword:', error);
    res.status(500).json({ error: 'فشل في إعادة تعيين كلمة المرور' });
  }
};

// POST /auth/social  { provider: 'google'|'facebook', token: string }
export const socialAuth = async (req: Request, res: Response) => {
  try {
    const { provider, token } = req.body;
    if (!token || !['google', 'facebook'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider or missing token' });
    }

    let providerUserId: string;
    let email: string;
    let name: string;
    let avatar: string | undefined;

    if (provider === 'google') {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) return res.status(401).json({ error: 'Invalid Google token' });
      providerUserId = payload.sub;
      email = payload.email!;
      name = payload.name || email.split('@')[0];
      avatar = payload.picture;
    } else {
      // Facebook — verify by calling Graph API
      const fbRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${token}`
      );
      if (!fbRes.ok) return res.status(401).json({ error: 'Invalid Facebook token' });
      const fbData: any = await fbRes.json();
      if (fbData.error) return res.status(401).json({ error: 'Invalid Facebook token' });
      providerUserId = fbData.id;
      email = fbData.email || `fb_${fbData.id}@facebook.com`;
      name = fbData.name;
      avatar = fbData.picture?.data?.url;
    }

    const providerField = provider === 'google' ? 'googleId' : 'facebookId';

    // 1. Find by provider ID first
    let user = await User.findOne({ [providerField]: providerUserId });

    // 2. Fall back to email match (link accounts automatically)
    if (!user && email && !email.startsWith('fb_')) {
      user = await User.findOne({ email });
    }

    if (user) {
      // Attach provider ID if not already set
      const updates: Record<string, any> = {};
      if (!(user as any)[providerField]) updates[providerField] = providerUserId;
      if (avatar && !user.avatar) updates.avatar = avatar;
      if (Object.keys(updates).length) await User.updateOne({ _id: user._id }, updates);
    } else {
      // Create new social user (no password required)
      user = await User.create({
        [providerField]: providerUserId,
        email,
        name,
        avatar,
        passwordHash: null,
        isEmailVerified: true,
      });
    }

    const jwtToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
        smartProfile: user.smartProfile,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error('❌ socialAuth error:', error);
    res.status(500).json({ error: 'Social authentication failed' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const user = await User.findById(userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      language: user.language,
      smartProfile: user.smartProfile
    });
  } catch (error: any) {
    console.error('❌ Error in getMe:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات المستخدم' });
  }
};