import { Response } from 'express';
import { AuthRequest } from '../types';
import { Favorite } from '../models';

export const getFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const favorites = await Favorite.find({ userId: req.user?.userId })
      .populate('placeId')
      .sort({ createdAt: -1 });

    res.json(favorites);
  } catch (error: any) {
    console.error('❌ Error in getFavorites:', error);
    // ✅ إرجاع رد واضح للواجهة بدلاً من تعليق السيرفر
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة المفضلة' });
  }
};

export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.body;

    const favorite = await Favorite.create({
      userId: req.user?.userId,
      placeId
    });

    res.status(201).json(favorite);
  } catch (error: any) {
    // ✅ تم الإبقاء على اصطياد خطأ التكرار (Duplicate Key)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'المكان موجود مسبقاً في المفضلة' });
    }
    console.error('❌ Error in addFavorite:', error);
    // ✅ منع تعليق الواجهة
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة المكان للمفضلة' });
  }
};

export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;

    const favorite = await Favorite.findOneAndDelete({
      userId: req.user?.userId,
      placeId
    });

    if (!favorite) {
      return res.status(404).json({ error: 'المكان غير موجود في المفضلة' });
    }

    res.json({ message: 'Favorite removed successfully' });
  } catch (error: any) {
    console.error('❌ Error in removeFavorite:', error);
    // ✅ منع تعليق الواجهة
    res.status(500).json({ error: 'حدث خطأ أثناء إزالة المكان من المفضلة' });
  }
};