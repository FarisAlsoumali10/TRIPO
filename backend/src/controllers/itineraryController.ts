import { Response } from 'express';
import { AuthRequest } from '../types';
import { Itinerary } from '../models'; // تم تعديل المسار ليتوافق مع باقي التطبيق

export const createItinerary = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ تحديث الخصائص لتتطابق مع CreateItineraryData في الواجهة الأمامية
    const { title, estimatedDuration, estimatedCost, distance, city, places, notes, status } = req.body;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'User must be authenticated' });
    }

    const itinerary = await Itinerary.create({
      userId: req.user.userId,
      title,
      city: city || 'Riyadh',
      estimatedDuration: estimatedDuration || 0,
      estimatedCost: estimatedCost || 0,
      distance: distance || 0,
      status: status || 'published', // 'draft' أو 'published'
      places: places || [],
      notes
    });

    return res.status(201).json(itinerary);
  } catch (error: any) {
    console.error('❌ Error in createItinerary:', error);
    return res.status(500).json({ error: 'حدث خطأ داخلي أثناء إنشاء الرحلة' });
  }
};

export const getAllItineraries = async (req: AuthRequest, res: Response) => {
  try {
    // ✅ دعم نظام الصفحات (Pagination) الذي يطلبه الـ Frontend
    const { city, page = 1, limit = 20 } = req.query;

    const filter: any = {
      status: 'published' // جلب الرحلات المنشورة فقط
    };

    if (city) {
      filter.city = { $regex: new RegExp(String(city), 'i') };
    }

    const skip = (Number(page) - 1) * Number(limit);

    // ✅ عمل Populate لاسم الكاتب وتفاصيل الأماكن لكي تعرضها الواجهة الأمامية
    const itineraries = await Itinerary.find(filter)
      .populate('userId', 'name avatar')
      .populate('places.placeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // إرسال البيانات مغلفة في { itineraries } كما يتوقع ملف api.ts في الواجهة
    return res.status(200).json({ itineraries });
  } catch (error: any) {
    console.error('❌ Error in getAllItineraries:', error);
    return res.status(500).json({ error: 'حدث خطأ داخلي أثناء جلب قائمة الرحلات' });
  }
};