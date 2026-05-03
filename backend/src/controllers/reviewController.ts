import { Response } from 'express';
import { AuthRequest } from '../types';
import { Review, Place, Itinerary, Campsite, Session, Rental, Notification } from '../models';
import { Tour } from '../models/Tour';

const updateRatingSummary = async (targetType: 'place' | 'itinerary' | 'campsite' | 'session' | 'rental' | 'tour', targetId: string) => {
  const reviews = await Review.find({ targetType, targetId });

  let Model: any;
  switch (targetType) {
    case 'place':
      Model = Place;
      break;
    case 'itinerary':
      Model = Itinerary;
      break;
    case 'campsite':
      Model = Campsite;
      break;
    case 'session':
      Model = Session;
      break;
    case 'rental':
      Model = Rental;
      break;
    case 'tour':
      Model = Tour;
      break;
    default:
      return;
  }

  if (reviews.length === 0) {
    await Model.findByIdAndUpdate(targetId, {
      'ratingSummary.avgRating': 0,
      'ratingSummary.reviewCount': 0
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = totalRating / reviews.length;

  await Model.findByIdAndUpdate(targetId, {
    'ratingSummary.avgRating': avgRating,
    'ratingSummary.reviewCount': reviews.length
  });
};

export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { targetType, targetId } = req.query;

    const query: any = {};
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;

    const reviews = await Review.find(query)
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error: any) {
    console.error('❌ Error in getReviews:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب التقييمات' });
  }
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const reviewData = {
      ...req.body,
      userId: req.user?.userId
    };

    const review = await Review.create(reviewData);

    // Update rating summary
    await updateRatingSummary(review.targetType as any, review.targetId.toString());

    // Notify the owner of the reviewed item
    try {
      let ownerId: string | undefined;
      if (review.targetType === 'tour') {
        const tour = await Tour.findById(review.targetId).select('ownerId').lean();
        ownerId = (tour as any)?.ownerId?.toString();
      } else if (review.targetType === 'rental') {
        const rental = await Rental.findById(review.targetId).select('hostId').lean();
        ownerId = (rental as any)?.hostId?.toString();
      }
      if (ownerId && ownerId !== review.userId?.toString()) {
        const payload = { reviewId: review._id, targetType: review.targetType, targetId: review.targetId, rating: review.rating };
        await Notification.create({ userId: ownerId, type: 'new_review', payload, read: false });
        const io = req.app?.get('io');
        if (io) io.to(`user:${ownerId}`).emit('notification', { type: 'new_review', payload });
      }
    } catch { /* non-fatal */ }

    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name avatar');

    res.status(201).json(populatedReview);
  } catch (error: any) {
    console.error('❌ Error in createReview:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة التقييم' });
  }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;
    const updates = req.body;

    const review = await Review.findOne({
      _id: reviewId,
      userId: req.user?.userId
    });

    if (!review) {
      return res.status(404).json({ error: 'التقييم غير موجود أو غير مصرح لك بتعديله' });
    }

    Object.assign(review, updates);
    await review.save();

    // Update rating summary
    await updateRatingSummary(review.targetType, review.targetId.toString());

    res.json(review);
  } catch (error: any) {
    console.error('❌ Error in updateReview:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث التقييم' });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findOne({
      _id: reviewId,
      userId: req.user?.userId
    });

    if (!review) {
      return res.status(404).json({ error: 'التقييم غير موجود أو غير مصرح لك بحذفه' });
    }

    const { targetType, targetId } = review;
    await review.deleteOne();

    // Update rating summary
    await updateRatingSummary(targetType, targetId.toString());

    res.json({ message: 'تم حذف التقييم بنجاح' });
  } catch (error: any) {
    console.error('❌ Error in deleteReview:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف التقييم' });
  }
};