
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  karamPoints: number; 
  walletBalance: number; // New field for monetary/reward balance
  fazaCount: number; // Number of successful help responses
  rank: 'Explorer' | 'Pathfinder' | "Faza'a Master"; 
  preferences?: SmartProfile;
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
  isResolved?: boolean;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  date: string; 
  time: string; 
  locationName: string;
  attendeesCount: number;
  image: string;
  communityId: string;
}

export interface SmartProfile {
  interests: string[];
  budgetLevel: 'low' | 'medium' | 'high'; 
  freeTime: number; // hours
}

export interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  lat: number;
  lng: number;
  x?: number;
  y?: number;
  avgCost: number;
  duration: number;
  rating?: number;
  reviews?: number;
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
  isPrivate?: boolean;
}

export interface Rental {
  id: string;
  title: string;
  type: 'Camp' | 'Chalet' | 'Apartment' | 'Kashta';
  price: number;
  image: string;
  locationName: string;
  rating: number;
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  ownerId: string;
  description: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface Itinerary {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  description: string;
  places: Place[];
  totalCost: number;
  totalDuration: number;
  likes: number;
  isVerified: boolean;
  reviews: Review[];
  communityId?: string;
  tags?: string[];
}

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
  itinerary: Itinerary;
  members: User[];
  chatMessages: ChatMessage[];
  expenses: Expense[];
}
