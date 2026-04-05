import { Response } from 'express';
import { AuthRequest } from '../types';
import { Place } from '../models';

export const getPlaces = async (req: AuthRequest, res: Response) => {
  try {
    const {
      city, categoryTags, category, search, minRating,
      page = 1, limit = 50,
      // advanced filters
      accessType, isFamilySuitable, isFoodTruck, isTrending,
      maxPrice, sortBy, gender, subcategory, cuisineType,
      hasGroupOffer, partnerVenue,
    } = req.query;

    const query: any = { status: 'active' };

    if (city) query.city = city;
    if (categoryTags) {
      const tags = (categoryTags as string).split(',');
      query.categoryTags = { $in: tags };
    }
    if (category) {
      query.categoryTags = { $elemMatch: { $regex: new RegExp(`^${category}$`, 'i') } };
    }
    if (search) {
      query.$text = { $search: search as string };
    }
    if (minRating) {
      query['ratingSummary.avgRating'] = { $gte: Number(minRating) };
    }
    if (accessType) query.accessType = accessType;
    if (isFamilySuitable === 'true') query.isFamilySuitable = true;
    if (isFoodTruck === 'true') query.isFoodTruck = true;
    if (isTrending === 'true') query.isTrending = true;
    if (maxPrice) query.priceRange = { $lte: Number(maxPrice) };
    if (gender) query.gender = gender;
    if (subcategory) query.subcategory = { $regex: new RegExp(subcategory as string, 'i') };
    if (cuisineType) query.cuisineType = { $regex: new RegExp(cuisineType as string, 'i') };
    if (hasGroupOffer === 'true') query['groupOffer.available'] = true;
    if (partnerVenue === 'true') query.partnerVenue = true;

    // Sort options
    let sortOption: any = { 'ratingSummary.avgRating': -1 };
    if (sortBy === 'price_asc')  sortOption = { priceRange: 1, avgCost: 1 };
    if (sortBy === 'price_desc') sortOption = { priceRange: -1, avgCost: -1 };
    if (sortBy === 'trending')   sortOption = { isTrending: -1, 'ratingSummary.avgRating': -1 };
    if (sortBy === 'newest')     sortOption = { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const places = await Place.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Place.countDocuments(query);

    res.json({
      places,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    console.error('❌ Error in getPlaces:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الأماكن' });
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