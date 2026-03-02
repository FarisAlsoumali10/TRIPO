import { Types } from 'mongoose';
import { Itinerary } from '../models';
import { IItinerary } from '../models/Itinerary';
import { SmartProfile } from '../types';

interface ScoredItinerary {
  itinerary: IItinerary;
  score: number;
}

const budgetRanges: Record<string, { min: number; max: number }> = {
  free: { min: 0, max: 0 },
  low: { min: 0, max: 100 },
  medium: { min: 50, max: 300 },
  high: { min: 200, max: 1000 }
};

const moodToActivityStyles: Record<string, string[]> = {
  adventurous: ['active', 'social', 'explorer'],
  chill: ['relaxed', 'casual', 'peaceful'],
  curious: ['explorer', 'cultural', 'learning'],
  social: ['social', 'group', 'active'],
  romantic: ['relaxed', 'intimate', 'romantic']
};

export class RecommendationService {
  private calculateFeasibilityScore(
    itinerary: IItinerary,
    smartProfile: SmartProfile
  ): number {
    let score = 0;

    // Time window match
    const timeRatio = itinerary.durationInMinutes / (smartProfile.typicalFreeTimeWindow * 60);
    if (timeRatio <= 1) {
      score += 40 * (1 - Math.abs(1 - timeRatio));
    } else {
      score += Math.max(0, 40 * (1 - (timeRatio - 1)));
    }

    score += 60;

    return score;
  }

  private calculateInterestScore(): number {
    return 15;
  }

  private calculateMoodScore(): number {
    return 15;
  }

  private calculateQualityScore(): number {
    return 12;
  }

  async getPersonalizedFeed(
    userId: Types.ObjectId | string,
    smartProfile: SmartProfile,
    page: number = 1,
    limit: number = 20
  ): Promise<{ itineraries: IItinerary[]; total: number; page: number; pages: number }> {
    const query = {
      isPublic: true,
      city: smartProfile.city
    };

    const allItineraries = await Itinerary.find(query)
      .populate('createdBy', 'name avatar')
      .lean();

    const scoredItineraries: ScoredItinerary[] = await Promise.all(
      allItineraries.map(async (itinerary) => {
        const feasibilityScore = this.calculateFeasibilityScore(itinerary as any, smartProfile);
        const interestScore = this.calculateInterestScore();
        const moodScore = this.calculateMoodScore();
        const qualityScore = this.calculateQualityScore();

        const totalScore = feasibilityScore + interestScore + moodScore + qualityScore;

        return {
          itinerary: itinerary as any,
          score: totalScore
        };
      })
    );

    scoredItineraries.sort((a, b) => b.score - a.score);

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
