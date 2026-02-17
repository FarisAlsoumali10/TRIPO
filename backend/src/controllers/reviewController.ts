import { Response } from 'express';
import { AuthRequest } from '../types';
import { Review, Place, Itinerary } from '../models';

const updateRatingSummary = async (targetType: 'place' | 'itinerary', targetId: string) => {
  const reviews = await Review.find({ targetType, targetId });

  if (reviews.length === 0) {
    const Model = targetType === 'place' ? Place : Itinerary;
    await Model.findByIdAndUpdate(targetId, {
      'ratingSummary.avgRating': 0,
      'ratingSummary.reviewCount': 0
    });
    return;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = totalRating / reviews.length;

  const Model = targetType === 'place' ? Place : Itinerary;
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
  } catch (error) {
    throw error;
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
    await updateRatingSummary(review.targetType, review.targetId.toString());

    const populatedReview = await Review.findById(review._id)
      .populate('userId', 'name avatar');

    res.status(201).json(populatedReview);
  } catch (error) {
    throw error;
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
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }

    Object.assign(review, updates);
    await review.save();

    // Update rating summary
    await updateRatingSummary(review.targetType, review.targetId.toString());

    res.json(review);
  } catch (error) {
    throw error;
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
      return res.status(404).json({ error: 'Review not found or not authorized' });
    }

    const { targetType, targetId } = review;
    await review.deleteOne();

    // Update rating summary
    await updateRatingSummary(targetType, targetId.toString());

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    throw error;
  }
};
