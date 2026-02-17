import { Request } from 'express';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: 'user' | 'admin' | 'host';
  };
}

export type UserRole = 'user' | 'admin' | 'host';
export type Language = 'en' | 'ar';
export type BudgetLevel = 'free' | 'low' | 'medium' | 'high';
export type ItineraryStatus = 'draft' | 'published';
export type GroupTripStatus = 'planning' | 'active' | 'completed' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved';
export type ActionTaken = 'hidden' | 'removed' | 'dismissed';
export type ContentStatus = 'active' | 'deactivated' | 'hidden' | 'removed';
export type MessageType = 'text' | 'system';
export type NotificationType = 'group_invitation' | 'new_message' | 'expense_added' | 'member_joined' | 'member_left';
export type ReviewTargetType = 'place' | 'itinerary';
export type ReportTargetType = 'itinerary' | 'message' | 'session' | 'campsite';
export type MarketplaceTargetType = 'session' | 'campsite';

export interface SmartProfile {
  interests: string[];
  preferredBudget: BudgetLevel;
  activityStyles: string[];
  typicalFreeTimeWindow: number;
  mood?: string;
  city: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RatingSummary {
  avgRating: number;
  reviewCount: number;
}

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

export interface Schedule {
  date: Date;
  startTime: string;
  endTime: string;
}

export interface PricingRange {
  min: number;
  max: number;
}
