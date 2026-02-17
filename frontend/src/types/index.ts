export type UserRole = 'user' | 'admin' | 'host';
export type Language = 'en' | 'ar';
export type BudgetLevel = 'free' | 'low' | 'medium' | 'high';

export interface SmartProfile {
  interests: string[];
  preferredBudget: BudgetLevel;
  activityStyles: string[];
  typicalFreeTimeWindow: number;
  mood?: string;
  city: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  language: Language;
  smartProfile: SmartProfile;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  language: Language;
  smartProfile: SmartProfile;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RatingSummary {
  avgRating: number;
  reviewCount: number;
}

export interface Place {
  _id: string;
  name: string;
  city: string;
  description: string;
  categoryTags: string[];
  coordinates: Coordinates;
  photos: string[];
  ratingSummary: RatingSummary;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceInItinerary {
  placeId: string | Place;
  order: number;
  timeSlot?: string;
  notes?: string;
}

export interface Itinerary {
  _id: string;
  userId: string | { name: string; avatar?: string };
  title: string;
  status: 'draft' | 'published';
  estimatedDuration: number;
  estimatedCost: number;
  distance: number;
  city: string;
  places: PlaceInItinerary[];
  notes?: string;
  isVerified: boolean;
  ratingSummary: RatingSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  userId: string | { name: string; avatar?: string };
  targetType: 'place' | 'itinerary';
  targetId: string;
  rating: number;
  title?: string;
  comment?: string;
  mediaRefs: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateItineraryData {
  title: string;
  estimatedDuration: number;
  estimatedCost: number;
  distance: number;
  city: string;
  places: Omit<PlaceInItinerary, 'placeId'> & { placeId: string }[];
  notes?: string;
}

export interface CreateReviewData {
  targetType: 'place' | 'itinerary';
  targetId: string;
  rating: number;
  title?: string;
  comment?: string;
}
