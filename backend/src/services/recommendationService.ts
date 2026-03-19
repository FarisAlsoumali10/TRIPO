import { Types } from 'mongoose';
import { Itinerary } from '../models';
import { IItinerary } from '../models/Itinerary';

interface ScoredItinerary {
  itinerary: any; // استخدمنا any هنا لتسهيل دمج البيانات المأهولة (Populated)
  score: number;
}

const budgetRanges: Record<string, { min: number; max: number }> = {
  free: { min: 0, max: 0 },
  low: { min: 0, max: 150 },
  medium: { min: 100, max: 500 },
  high: { min: 400, max: 5000 }
};

export class RecommendationService {

  // 1. حساب توافق الوقت (Max 30 Points)
  private calculateFeasibilityScore(itinerary: any, smartProfile: any): number {
    const itineraryDuration = itinerary.estimatedDuration || 60;
    // تم إصلاح الحسبة لأن typicalFreeTimeWindow بالدقائق في الموديل الجديد
    const timeRatio = itineraryDuration / (smartProfile.typicalFreeTimeWindow || 180);

    if (timeRatio <= 1) {
      return 30 * timeRatio; // مناسب جداً للوقت المتاح
    } else {
      return Math.max(0, 30 - ((timeRatio - 1) * 15)); // خصم نقاط إذا كانت الرحلة أطول من وقته
    }
  }

  // 2. حساب توافق الميزانية (Max 30 Points)
  private calculateBudgetScore(itinerary: any, smartProfile: any): number {
    const userBudget = budgetRanges[smartProfile.preferredBudget || 'medium'];
    const itineraryCost = itinerary.estimatedCost || 0;

    if (itineraryCost === 0 && smartProfile.preferredBudget === 'free') return 30;
    if (itineraryCost >= userBudget.min && itineraryCost <= userBudget.max) return 30; // تطابق مثالي
    if (itineraryCost < userBudget.min) return 20; // أرخص من ميزانيته (ممتاز أيضاً)

    return Math.max(0, 30 - ((itineraryCost - userBudget.max) * 0.1)); // خصم إذا كانت أغلى بكثير
  }

  // 3. حساب جودة الرحلة بناءً على تقييمات المستخدمين (Max 40 Points)
  private calculateQualityScore(itinerary: any): number {
    const avgRating = itinerary.ratingSummary?.avgRating || 0;
    const reviewCount = itinerary.ratingSummary?.reviewCount || 0;

    // رحلة جديدة بدون تقييمات تأخذ درجة متوسطة كتشجيع
    if (reviewCount === 0) return 20;

    // حساب الجودة بناءً على النجوم (5 نجوم = 40 نقطة)
    return (avgRating / 5) * 40;
  }

  async getPersonalizedFeed(
    userId: Types.ObjectId | string,
    smartProfile: any,
    page: number = 1,
    limit: number = 20
  ): Promise<{ itineraries: any[]; total: number; page: number; pages: number }> {

    // ✅ إصلاح عقد البيانات: استخدام status بدلاً من isPublic
    const query = {
      status: 'published',
      city: smartProfile.city
    };

    // ✅ حماية السيرفر: جلب أفضل 200 رحلة فقط للتقييم بدلاً من ملايين الرحلات
    const potentialItineraries = await Itinerary.find(query)
      .populate('userId', 'name avatar')
      .populate('places.placeId') // ✅ جلب تفاصيل الأماكن لتعرضها الواجهة
      .limit(200)
      .lean();

    // تشغيل الخوارزمية لحساب الدرجات
    const scoredItineraries: ScoredItinerary[] = potentialItineraries.map((itinerary) => {
      const feasibilityScore = this.calculateFeasibilityScore(itinerary, smartProfile);
      const budgetScore = this.calculateBudgetScore(itinerary, smartProfile);
      const qualityScore = this.calculateQualityScore(itinerary);

      const totalScore = feasibilityScore + budgetScore + qualityScore; // المجموع من 100

      return {
        itinerary,
        score: totalScore
      };
    });

    // ترتيب الرحلات من الأعلى توافقاً إلى الأقل
    scoredItineraries.sort((a, b) => b.score - a.score);

    // تطبيق نظام الصفحات (Pagination)
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