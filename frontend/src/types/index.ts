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
  role?: UserRole;
  language?: Language;
  smartProfile?: SmartProfile;
  createdAt?: string;

  // --- خصائص الواجهة القديمة (لمنع تعطل الشاشات) ---
  karamPoints?: number;
  walletBalance?: number;
  fazaCount?: number;
  rank?: string;
  preferences?: any;
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

export interface OpeningHoursDay {
  open: string;   // "08:00"
  close: string;  // "22:00"
  closed?: boolean;
}

export interface Place {
  _id?: string;
  id?: string;
  name: string;
  city?: string;
  description?: string;
  categoryTags?: string[];
  coordinates?: Coordinates;
  photos?: string[];
  ratingSummary?: RatingSummary;
  status?: string;
  createdAt?: string;
  updatedAt?: string;

  // --- New TripAdvisor-inspired fields ---
  priceRange?: 1 | 2 | 3 | 4;
  openingHours?: Record<string, OpeningHoursDay>;
  accessibility?: { wheelchair?: boolean; parking?: boolean; family?: boolean };
  bestSeasons?: ('spring' | 'summer' | 'autumn' | 'winter')[];

  // --- legacy ---
  category?: string;
  image?: string;
  lat?: number;
  lng?: number;
  avgCost?: number;
  duration?: number;
  rating?: number;
  reviews?: number;
}

export interface PlaceInItinerary {
  placeId: string | Place;
  order: number;
  timeSlot?: string;
  notes?: string;
}

export interface Itinerary {
  _id?: string;
  id?: string;
  userId?: string | { name: string; avatar?: string };
  title: string;
  status?: 'draft' | 'published';
  estimatedDuration?: number;
  estimatedCost?: number;
  distance?: number;
  city?: string;
  places: any[]; // جعلناها مرنة لتقبل النوعين
  notes?: string;
  isVerified?: boolean;
  ratingSummary?: RatingSummary;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;

  // --- خصائص الواجهة القديمة ---
  authorId?: string;
  authorName?: string;
  totalCost?: number;
  totalDuration?: number;
  likes?: number;
  communityId?: string;
  description?: string;
  reviews?: any[];
}

export interface Review {
  _id?: string;
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

export interface Rental {
  id: string;
  title: string;
  type: string;
  price: number | string;
  locationName: string;
  image: string;
  images?: string[];
  rating?: number;
  x?: number;
  y?: number;
  lat?: number;
  lng?: number;
  ownerId?: string;
  description?: string;
  mapQuery?: string;
  contactName?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
}

// ==========================================
// Types مفقودة كانت تسبب أخطاء في مجلد screens
// ==========================================

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Expense {
  id: string;
  payerId: string;
  description: string;
  amount: number;
  timestamp: number;
}

export interface GroupTrip {
  id: string;
  backendId?: string; // MongoDB _id of the persisted group trip
  itinerary: Itinerary;
  members: User[];
  chatMessages: ChatMessage[];
  expenses: Expense[];
}

export interface PrivateTrip {
  id: string;
  backendId?: string;
  title: string;
  startDate?: string;
  endDate?: string;
  members: User[];
  organizerId?: string;
  chatMessages: ChatMessage[];
  expenses: Expense[];
  isPrivate: true;
}

export interface Community {
  id: string;
  name: string;
  icon: string;
  description: string;
  image: string;
  memberCount: number;
  activeTripsCount: number;
  category: string;
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  date: string;
  time: string;
  locationName: string;
  attendeesCount: number;
  image: string;
}

export interface WishList {
  id: string;
  name: string;
  placeIds: string[];
  createdAt: string;
}

export interface MajlisThread {
  id: string;
  communityId: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  tags: string[];
  replies: { id: string; text: string; authorName: string; createdAt: string }[];
}

export interface QAItem {
  id: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answers: { id: string; text: string; answeredBy: string; answeredAt: string }[];
}

export interface AppNotification {
  id: string;
  type: 'like' | 'group_join' | 'community_reply';
  message: string;
  timestamp: number;
  read: boolean;
}

export interface FazaRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  question: string;
  communityId: string;
  timestamp: number;
  pointsReward: number;
}

// ==========================================
// 🗺️ Tours & Experiences
// ==========================================

export interface TourStop {
  order: number;
  placeName: string;
  duration: number; // minutes
  description: string;
  timeSlot?: string;
  image?: string;
}

export interface Tour {
  id: string;
  _id?: string;
  title: string;
  description: string;
  highlights: string[];
  heroImage: string;
  images?: string[];
  pricePerPerson: number;
  currency?: string;
  maxGroupSize: number;
  minGroupSize?: number;
  stops: TourStop[];
  departureLocation: string;
  departureTime: string;
  returnTime?: string;
  totalDuration: number; // hours
  difficulty: 'easy' | 'moderate' | 'challenging';
  included: string[];
  excluded: string[];
  guideName: string;
  guideAvatar?: string;
  guideRating?: number;
  availableDates?: string[];
  category: string;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  itineraryId?: string;
  baseItineraryId?: string;
  bookingsCount?: number;
}