import { Types } from 'mongoose';
import { Itinerary, Place } from '../models';
import { IItinerary } from '../models/Itinerary';
import { SmartProfile } from '../types';

interface ScoredItinerary {
  itinerary: IItinerary;
  score: number;
}

// Budget mapping to cost ranges
const budgetRanges: Record<string, { min: number; max: number }> = {
  free: { min: 0, max: 0 },
  low: { min: 0, max: 100 },
  medium: { min: 50, max: 300 },
  high: { min: 200, max: 1000 }
};

// Mood to activity style mapping
const moodToActivityStyles: Record<string, string[]> = {
  adventurous: ['active', 'social', 'explorer'],
  chill: ['relaxed', 'casual', 'peaceful'],
  curious: ['explorer', 'cultural', 'learning'],
  social: ['social', 'group', 'active'],
  romantic: ['relaxed', 'intimate', 'romantic']
};

export class RecommendationService {
  private async getItineraryCategories(itinerary: IItinerary): Promise<string[]> {
    const placeIds = itinerary.places.map(p => p.placeId);
    const places = await Place.find({ _id: { $in: placeIds } }).select('categoryTags');

    const allCategories = places.flatMap(p => p.categoryTags);
    return Array.from(new Set(allCategories));
  }

  private calculateFeasibilityScore(
    itinerary: IItinerary,
    smartProfile: SmartProfile
  ): number {
    let score = 0;

    // Time window match (40% of feasibility)
    const timeRatio = itinerary.estimatedDuration / smartProfile.typicalFreeTimeWindow;
    if (timeRatio <= 1) {
      score += 40 * (1 - Math.abs(1 - timeRatio)); // Perfect match if close to time window
    } else {
      score += Math.max(0, 40 * (1 - (timeRatio - 1))); // Penalty for exceeding time
    }

    // Budget match (60% of feasibility)
    const budgetRange = budgetRanges[smartProfile.preferredBudget];
    if (itinerary.estimatedCost <= budgetRange.max && itinerary.estimatedCost >= budgetRange.min) {
      score += 60; // Perfect budget match
    } else if (itinerary.estimatedCost < budgetRange.min) {
      score += 50; // Under budget is okay
    } else {
      const overBudgetRatio = (itinerary.estimatedCost - budgetRange.max) / budgetRange.max;
      score += Math.max(0, 60 * (1 - overBudgetRatio)); // Penalty for over budget
    }

    return score;
  }

  private calculateInterestScore(
    itineraryCategories: string[],
    userInterests: string[]
  ): number {
    if (userInterests.length === 0) return 15; // Neutral score if no interests

    const matchCount = itineraryCategories.filter(cat =>
      userInterests.some(interest => cat.toLowerCase().includes(interest.toLowerCase()))
    ).length;

    const matchRatio = matchCount / Math.max(userInterests.length, itineraryCategories.length);
    return matchRatio * 30;
  }

  private calculateMoodScore(
    itineraryCategories: string[],
    smartProfile: SmartProfile
  ): number {
    if (!smartProfile.mood) return 7.5; // Neutral score if no mood

    const desiredActivityStyles = moodToActivityStyles[smartProfile.mood] || [];
    const styleMatches = smartProfile.activityStyles.filter(style =>
      desiredActivityStyles.includes(style)
    ).length;

    return (styleMatches / Math.max(desiredActivityStyles.length, 1)) * 15;
  }

  private calculateQualityScore(itinerary: IItinerary): number {
    const { avgRating, reviewCount } = itinerary.ratingSummary;

    if (reviewCount === 0) return 7.5; // Neutral score for new itineraries

    // Wilson score lower bound for confidence
    const confidence = 0.95;
    const z = 1.96; // 95% confidence z-score
    const phat = avgRating / 5; // Normalize to 0-1

    const wilsonScore = (phat + z * z / (2 * reviewCount) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * reviewCount)) / reviewCount)) / (1 + z * z / reviewCount);

    // Boost for verified itineraries
    const verifiedBonus = itinerary.isVerified ? 3 : 0;

    return wilsonScore * 12 + verifiedBonus;
  }

  async getPersonalizedFeed(
    userId: Types.ObjectId | string,
    smartProfile: SmartProfile,
    page: number = 1,
    limit: number = 20
  ): Promise<{ itineraries: IItinerary[]; total: number; page: number; pages: number }> {
    // Query published itineraries in user's city
    const query = {
      status: 'published',
      city: smartProfile.city
    };

    const allItineraries = await Itinerary.find(query)
      .populate('userId', 'name avatar')
      .populate('places.placeId', 'name photos categoryTags')
      .lean();

    // Score each itinerary
    const scoredItineraries: ScoredItinerary[] = await Promise.all(
      allItineraries.map(async (itinerary) => {
        const categories = await this.getItineraryCategories(itinerary as IItinerary);

        const feasibilityScore = this.calculateFeasibilityScore(itinerary as IItinerary, smartProfile);
        const interestScore = this.calculateInterestScore(categories, smartProfile.interests);
        const moodScore = this.calculateMoodScore(categories, smartProfile);
        const qualityScore = this.calculateQualityScore(itinerary as IItinerary);

        const totalScore = feasibilityScore + interestScore + moodScore + qualityScore;

        return {
          itinerary: itinerary as IItinerary,
          score: totalScore
        };
      })
    );

    // Sort by score descending
    scoredItineraries.sort((a, b) => b.score - a.score);

    // Pagination
    const total = scoredItineraries.length;
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const paginatedItineraries = scoredItineraries
      .slice(skip, skip + limit)
      .map(si => si.itinerary);

    return {
      itineraries: paginatedItineraries,
      total,
      page,
      pages
    };
  }
}

export const recommendationService = new RecommendationService();
