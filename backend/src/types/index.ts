import { Request } from 'express';
import { Types } from 'mongoose';

// ==========================================
// 🛡️ Authentication & Authorization Types
// ==========================================

export type UserRole = 'user' | 'admin' | 'host';

/**
 * يمثل الطلب (Request) القادم من العميل بعد اجتيازه لميدلوير المصادقة.
 * يحتوي على بيانات المستخدم المستخرجة من الـ JWT Token.
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

// ==========================================
// 🏷️ Shared Enums / String Literals
// ==========================================

export type Language = 'en' | 'ar';
export type BudgetLevel = 'free' | 'low' | 'medium' | 'high';
export type ItineraryStatus = 'draft' | 'published' | 'hidden' | 'removed';
export type GroupTripStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved';
export type ActionTaken = 'hidden' | 'removed' | 'dismissed';
export type ContentStatus = 'active' | 'deactivated' | 'hidden' | 'removed';

// ✅ تم توسيعها لتطابق ترقيات الباك-إند
export type MessageType = 'text' | 'system' | 'image' | 'location';
export type NotificationType = 'group_invitation' | 'new_message' | 'expense_added' | 'member_joined' | 'member_left' | 'booking_status' | 'system_alert' | 'new_booking';
export type ReviewTargetType = 'place' | 'itinerary' | 'campsite' | 'session' | 'rental' | 'tour';
export type ReportTargetType = 'itinerary' | 'message' | 'session' | 'campsite' | 'user' | 'place' | 'review';
export type MarketplaceTargetType = 'session' | 'campsite' | 'rental';

// ==========================================
// 👤 Profile & User Data Structures
// ==========================================

/**
 * الملف الذكي للمستخدم، يُستخدم لتغذية خوارزمية التوصية بالذكاء الاصطناعي
 */
export interface SmartProfile {
  interests: string[];
  preferredBudget: BudgetLevel;
  activityStyles: string[];
  typicalFreeTimeWindow: number; // بالدقائق
  mood?: string;
  city: string;
  travelVibe?: 'chill' | 'adventurous' | 'cultural' | 'foodie';
  favoriteSeason?: 'winter' | 'spring' | 'summer' | 'autumn';
}

// ==========================================
// 🌍 Location & Geography
// ==========================================

export interface Coordinates {
  lat: number;
  lng: number;
}

// ==========================================
// ⭐ Ratings & Reviews
// ==========================================

export interface RatingSummary {
  avgRating: number;
  reviewCount: number;
}

// ==========================================
// 🗺️ Itinerary & Trip Planning
// ==========================================

export interface PlaceInItinerary {
  placeId: Types.ObjectId;
  order: number;
  timeSlot?: string;
  notes?: string;
}

export interface Invitation {
  userId: Types.ObjectId;
  status: InvitationStatus;
  sentAt: Date;
}

// ==========================================
// 🏕️ Marketplace (Sessions & Campsites)
// ==========================================

export interface Schedule {
  date: Date;
  startTime: string; // صيغة 24 ساعة (مثال: "14:30")
  endTime: string;
}

export interface PricingRange {
  min: number;
  max: number;
}