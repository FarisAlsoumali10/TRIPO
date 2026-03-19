import { Response } from 'express';
import { AuthRequest } from '../types';
import { User, Place, Itinerary, GroupTrip, Report } from '../models';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalPlaces,
      totalItineraries,
      totalGroupTrips,
      pendingReports
    ] = await Promise.all([
      User.countDocuments(),
      Place.countDocuments({ status: 'active' }),
      Itinerary.countDocuments({ status: 'published' }),
      GroupTrip.countDocuments(),
      Report.countDocuments({ status: 'pending' })
    ]);

    const recentUsers = await User.find()
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentReports = await Report.find()
      .populate('reporterId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      stats: {
        totalUsers,
        totalPlaces,
        totalItineraries,
        totalGroupTrips,
        pendingReports
      },
      recentUsers,
      recentReports
    });
  } catch (error: any) {
    console.error('❌ Error in getDashboard:', error);
    // ✅ إرجاع رد واضح للواجهة بدلاً من تعليق السيرفر
    res.status(500).json({ error: 'حدث خطأ داخلي في الخادم أثناء جلب بيانات لوحة التحكم' });
  }
};

export const hideContent = async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;

    let Model;
    switch (type) {
      case 'place':
        Model = Place;
        break;
      case 'itinerary':
        Model = Itinerary;
        break;
      default:
        return res.status(400).json({ error: 'Invalid content type' });
    }

    const content = await (Model as any).findByIdAndUpdate(
      id,
      { status: 'hidden' },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.status(200).json({ message: 'Content hidden successfully', content });
  } catch (error: any) {
    console.error(`❌ Error hiding ${req.params.type}:`, error);
    // ✅ منع تعليق السيرفر
    res.status(500).json({ error: 'فشل في إخفاء المحتوى' });
  }
};

export const removeContent = async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;

    let Model;
    switch (type) {
      case 'place':
        Model = Place;
        break;
      case 'itinerary':
        Model = Itinerary;
        break;
      default:
        return res.status(400).json({ error: 'Invalid content type' });
    }

    const content = await (Model as any).findByIdAndUpdate(
      id,
      { status: 'removed' },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.status(200).json({ message: 'Content removed successfully', content });
  } catch (error: any) {
    console.error(`❌ Error removing ${req.params.type}:`, error);
    // ✅ منع تعليق السيرفر
    res.status(500).json({ error: 'فشل في إزالة المحتوى' });
  }
};