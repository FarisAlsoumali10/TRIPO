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
      smartProfile: user.smartProfile,
      createdAt: user.createdAt
    });
  } catch (error) {
    throw error;
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatar, language } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      { name, avatar, language },
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
      smartProfile: user.smartProfile
    });
  } catch (error) {
    throw error;
  }
};

export const updateSmartProfile = async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?.userId,
      { $set: { ...Object.keys(updates).reduce((acc, key) => {
        acc[`smartProfile.${key}`] = updates[key];
        return acc;
      }, {} as Record<string, any>) } },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      smartProfile: user.smartProfile
    });
  } catch (error) {
    throw error;
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
  } catch (error) {
    throw error;
  }
};
