import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { Place } from '../models';

export const getAllPlaces = async (req: Request, res: Response) => {
  try {
    const places = await Place.find({}).limit(50).lean();
    return res.status(200).json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (error: any) {
    console.error('❌ Error fetching places:', error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const getPlace = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;

    const place = await Place.findOne({ _id: placeId, status: 'active' });

    if (!place) {
      return res.status(404).json({ error: 'المكان غير موجود' });
    }

    res.json(place);
  } catch (error: any) {
    console.error('❌ Error in getPlace:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل المكان' });
  }
};

export const createPlace = async (req: AuthRequest, res: Response) => {
  try {
    const placeData = req.body;

    const place = await Place.create(placeData);

    res.status(201).json(place);
  } catch (error: any) {
    console.error('❌ Error in createPlace:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة المكان الجديد' });
  }
};

export const updatePlace = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;
    const updates = req.body;

    const place = await Place.findByIdAndUpdate(
      placeId,
      updates,
      { new: true, runValidators: true }
    );

    if (!place) {
      return res.status(404).json({ error: 'المكان غير موجود لتحديثه' });
    }

    res.json(place);
  } catch (error: any) {
    console.error('❌ Error in updatePlace:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات المكان' });
  }
};

export const deletePlace = async (req: AuthRequest, res: Response) => {
  try {
    const { placeId } = req.params;

    const place = await Place.findByIdAndUpdate(
      placeId,
      { status: 'deactivated' },
      { new: true }
    );

    if (!place) {
      return res.status(404).json({ error: 'المكان غير موجود لحذفه' });
    }

    res.json({ message: 'تم إلغاء تفعيل المكان بنجاح' });
  } catch (error: any) {
    console.error('❌ Error in deletePlace:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء محاولة إلغاء تفعيل المكان' });
  }
};