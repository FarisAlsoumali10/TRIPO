import { Response } from 'express';
import { AuthRequest } from '../types';
import { User } from '../models';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      language: user.language,
      preferences: user.preferences,
      walletBalance: user.walletBalance ?? 0,
      tripoPoints: user.tripoPoints,
      smartProfile: user.smartProfile,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('❌ Error in getProfile:', error);
    // ✅ منع تعليق الواجهة الأمامية
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الملف الشخصي' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatar, language, preferences } = req.body;

    const updateFields: Record<string, any> = {};
    if (name !== undefined) updateFields.name = name;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (language !== undefined) updateFields.language = language;

    if (preferences && typeof preferences === 'object') {
      if (typeof preferences.notifications === 'boolean') {
        updateFields['preferences.notifications'] = preferences.notifications;
      }
      if (typeof preferences.locationSharing === 'boolean') {
        updateFields['preferences.locationSharing'] = preferences.locationSharing;
      }
      if (typeof preferences.analytics === 'boolean') {
        updateFields['preferences.analytics'] = preferences.analytics;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      language: user.language,
      preferences: user.preferences,
      smartProfile: user.smartProfile,
    });
  } catch (error: any) {
    console.error('❌ Error in updateProfile:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الملف الشخصي' });
  }
};

export const updateSmartProfile = async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      {
        $set: {
          ...Object.keys(updates).reduce((acc, key) => {
            acc[`smartProfile.${key}`] = updates[key];
            return acc;
          }, {} as Record<string, any>)
        }
      },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    console.error('❌ Error in updateSmartProfile:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث التفضيلات الذكية' });
  }
};

export const getPublicProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name avatar createdAt');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      memberSince: user.createdAt
    });
  } catch (error: any) {
    console.error('❌ Error in getPublicProfile:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الملف الشخصي العام' });
  }
};