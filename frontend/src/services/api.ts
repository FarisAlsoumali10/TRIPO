/// <reference types="vite/client" />
import axios from 'axios';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// ── Shared axios config ───────────────────────────────────────────────────────

const BASE_CONFIG = {
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
} as const;

// ── Public client — no auth header, no token clearing ────────────────────────
// Use for: GET /places, GET /tours, GET /rentals (browsable by guests)

const publicApi = axios.create(BASE_CONFIG);

// ── Authenticated client — attaches token, handles 401 ───────────────────────
// Use for: everything that requires a logged-in user

const api = axios.create(BASE_CONFIG);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!error.config?.headers?.Authorization;
      // FIX: only clear token + fire event when we actually sent one and it was rejected.
      // Previously this ran unconditionally, wiping storage on guest 401s too.
      if (hadToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// ── Shared Utilities ──────────────────────────────────────────────────────────

type AnyRecord = Record<string, any>;

/** Normalizes _id → id across all response objects */
const withId = <T extends AnyRecord>(item: T): T => ({ ...item, id: item._id ?? item.id });

/** Safely extracts an array from varied API response shapes */
const toList = (data: any, ...keys: string[]): AnyRecord[] => {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data[k])) return data[k];
  return Array.isArray(data.data) ? data.data : [];
};

const isMongoId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

const mapMessage = (m: AnyRecord) => ({
  id: m._id ?? m.id,
  userId: m.senderId?._id ?? m.senderId ?? '',
  userName: m.senderId?.name ?? 'Unknown',
  text: m.content ?? m.text ?? '',
  timestamp: m.createdAt ? +new Date(m.createdAt) : Date.now(),
});

const mapExpense = (
  e: AnyRecord,
  defaults: { payerId?: string; description?: string; amount?: number } = {}
) => ({
  id: e._id ?? e.id,
  payerId: e.payerId?._id ?? e.payerId ?? defaults.payerId ?? '',
  description: e.description ?? defaults.description ?? '',
  amount: e.amount ?? defaults.amount ?? 0,
  timestamp: e.createdAt ? +new Date(e.createdAt) : Date.now(),
});

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (credentials: LoginCredentials): Promise<AuthResponse> =>
    api.post('/auth/login', credentials).then((r) => r.data),

  register: (registerData: RegisterData): Promise<AuthResponse> =>
    api.post('/auth/register', registerData).then((r) => r.data),

  getProfile: (): Promise<User> => api.get('/profile').then((r) => r.data),

  updateProfile: (updates: Partial<User>): Promise<User> =>
    api.patch('/profile', updates).then((r) => r.data),

  updateSmartProfile: (smartProfile: Partial<User['smartProfile']>) =>
    api.patch('/profile/smart-profile', smartProfile).then((r) => r.data),

  // FIX: call this only when a token exists — guard in your app root:
  // const token = localStorage.getItem('token');
  // if (token) authAPI.getMe().then(...)
  getMe: (): Promise<User> => api.get('/auth/me').then((r) => r.data),
};

// ── Itinerary API — auth required ─────────────────────────────────────────────

export const itineraryAPI = {
  getItineraries: async (params?: { page?: number; limit?: number; status?: string }) => {
    const { data } = await api.get('/itineraries', { params });
    return toList(data, 'itineraries').map(withId);
  },

  getFeed: (page = 1, limit = 20) => itineraryAPI.getItineraries({ page, limit }),

  getItinerary: (id: string) => api.get(`/itineraries/${id}`).then((r) => r.data),

  createItinerary: (itinerary: AnyRecord) =>
    api.post('/itineraries', itinerary).then((r) => r.data),

  updateItinerary: (id: string, updates: AnyRecord) =>
    api.patch(`/itineraries/${id}`, updates).then((r) => r.data),

  deleteItinerary: (id: string) =>
    api.delete(`/itineraries/${id}`).then((r) => r.data),
};

// ── Place API — GET is public, writes are auth-protected ──────────────────────

export const placeAPI = {
  getPlaces: async (params?: AnyRecord) => {
    const { data } = await publicApi.get('/places', { params });
    return toList(data, 'places').map(withId);
  },

  getAll: async (params?: AnyRecord) => placeAPI.getPlaces(params),

  getPlace: async (id: string) => {
    const { data } = await publicApi.get(`/places/${id}`);
    return withId(data.data ?? data);
  },

  createPlace: (data: AnyRecord) => api.post('/places', data).then((r) => r.data),

  updatePlace: (id: string, updates: AnyRecord) =>
    api.patch(`/places/${id}`, updates).then((r) => r.data),

  /** Returns saved place IDs for the current user */
  getSavedPlaces: async (): Promise<string[]> => {
    const { data } = await api.get('/favorites');
    const list = toList(data, 'favorites', 'data');
    return list.map((f) => f.placeId?._id ?? f.placeId ?? f._id ?? f.id ?? '').filter(Boolean);
  },

  /** Optimistic-safe: toggles the saved state */
  toggleSavedPlace: (placeId: string) =>
    api.post('/favorites/toggle', { placeId }).then((r) => r.data),
};

// ── Tour API — GET is public, booking is auth-protected ───────────────────────

export const tourAPI = {
  getTours: async (params?: { category?: string }) => {
    const { data } = await publicApi.get('/tours', { params });
    return toList(data, 'tours').map(withId);
  },

  getTour: async (id: string) => {
    const { data } = await publicApi.get(`/tours/${id}`);
    return withId(data.data ?? data);
  },

  bookTour: (
    tourId: string,
    payload: { date: string; guests: number; paymentDetails?: AnyRecord }
  ) => api.post(`/tours/${tourId}/book`, payload).then((r) => r.data),

  /** Returns saved tour IDs for the current user */
  getSavedTours: async (): Promise<string[]> => {
    const { data } = await api.get('/favorites', { params: { type: 'tour' } });
    const list = toList(data, 'saved', 'tours', 'favorites', 'data');
    return list.map((t) => t._id ?? t.id ?? '').filter(Boolean);
  },

  /** Toggles saved state for a tour */
  toggleSavedTour: (tourId: string) =>
    api.post(`/favorites/toggle`, { itemId: tourId, itemType: 'tour' }).then((r) => r.data),
};

// ── Rental API — GET is public, writes are auth-protected ────────────────────

export const rentalAPI = {
  getRentals: async (params?: AnyRecord) => {
    const { data } = await publicApi.get('/rentals', { params });
    return toList(data, 'rentals', 'data').map(withId);
  },

  getSportVenues: async (): Promise<AnyRecord[]> => {
    const { data } = await publicApi.get('/rentals', { params: { type: 'sport' } });
    return toList(data, 'rentals', 'data').map(withId);
  },

  createRental: (rentalData: AnyRecord) =>
    api.post('/rentals', rentalData).then((r) => r.data),

  /** Book a rental time slot */
  bookTimeSlot: (
    rentalId: string,
    payload: { date: string; nightsOrHours: number; slot?: string; totalPrice: number }
  ) => api.post(`/rentals/${rentalId}/book`, payload).then((r) => r.data),

  /** Get reviews for a rental */
  getReviews: async (rentalId: string): Promise<AnyRecord[]> => {
    const { data } = await publicApi.get('/reviews', {
      params: { targetType: 'rental', targetId: rentalId },
    });
    return toList(data, 'reviews', 'data').map(withId);
  },

  createReview: (rentalId: string, payload: AnyRecord) =>
    api.post('/reviews', { ...payload, targetType: 'rental', targetId: rentalId }).then((r) => r.data),

  getSavedRentals: async (): Promise<string[]> => {
    const { data } = await api.get('/favorites', { params: { type: 'rental' } });
    const list = toList(data, 'saved', 'rentals', 'favorites', 'data');
    return list.map((r) => r._id ?? r.id ?? '').filter(Boolean);
  },

  getFavorites: async (): Promise<string[]> => rentalAPI.getSavedRentals(),

  toggleSavedRental: (rentalId: string) =>
    api.post('/favorites/toggle', { itemId: rentalId, itemType: 'rental' }).then((r) => r.data),

  toggleFavorite: (rentalId: string) => rentalAPI.toggleSavedRental(rentalId),
};

// ── Group Trip API ────────────────────────────────────────────────────────────

export const groupTripAPI = {
  create: async (baseItineraryId: string, title: string) => {
    const { data } = await api.post('/group-trips', { baseItineraryId, title });
    return data;
  },

  getMessages: async (groupTripId: string) => {
    const { data } = await api.get('/messages', { params: { groupTripId } });
    return toList(data, 'messages').map(mapMessage);
  },

  sendMessage: async (groupTripId: string, content: string) => {
    const { data } = await api.post('/messages', { groupTripId, content, type: 'text' });
    return { ...mapMessage(data), userName: data.senderId?.name ?? 'Me', text: data.content ?? content };
  },

  getExpenses: async (groupTripId: string) => {
    const { data } = await api.get('/expenses', { params: { groupTripId } });
    return toList(data).map((e) => mapExpense(e));
  },

  addExpense: async (
    groupTripId: string,
    description: string,
    amount: number,
    payerId: string,
    memberIds: string[]
  ) => {
    const involvedMemberIds = [
      ...new Set([...memberIds.filter(isMongoId), ...(isMongoId(payerId) ? [payerId] : [])]),
    ];

    const { data } = await api.post('/expenses', {
      groupTripId, description, amount,
      currency: 'SAR', category: 'other', splitType: 'equal',
      involvedMemberIds: involvedMemberIds.length ? involvedMemberIds : [payerId],
    });

    return mapExpense(data, { payerId, description, amount });
  },
};

// ── Community API ─────────────────────────────────────────────────────────────

export const communityAPI = {
  getCommunities: async () => {
    const { data } = await api.get('/communities');
    return toList(data, 'communities').map(withId);
  },

  getCommunity: async (id: string) => {
    const { data } = await api.get(`/communities/${id}`);
    return withId(data.data ?? data);
  },

  getJoinedCommunityIds: async (): Promise<string[]> => {
    const { data } = await api.get('/communities/me/joined');
    const list = toList(data, 'joined', 'communities', 'data');
    return list.map((c) => c._id ?? c.id ?? '').filter(Boolean);
  },

  joinCommunity: (communityId: string) =>
    api.post(`/communities/${communityId}/join`).then((r) => r.data),

  leaveCommunity: (communityId: string) =>
    api.delete(`/communities/${communityId}/join`).then((r) => r.data),

  getSubscribedCommunityIds: async (): Promise<string[]> => {
    const { data } = await api.get('/communities/me/subscribed');
    const list = toList(data, 'subscribed', 'communities', 'data');
    return list.map((c) => c._id ?? c.id ?? '').filter(Boolean);
  },

  subscribeCommunity: (communityId: string) =>
    api.post(`/communities/${communityId}/subscribe`).then((r) => r.data),

  unsubscribeCommunity: (communityId: string) =>
    api.delete(`/communities/${communityId}/subscribe`).then((r) => r.data),
};

// ── Event API ─────────────────────────────────────────────────────────────────

export const eventAPI = {
  getEvents: async (params?: AnyRecord) => {
    const { data } = await publicApi.get('/events', { params });
    return toList(data, 'events', 'data').map(withId);
  },

  getEvent: async (id: string) => {
    const { data } = await publicApi.get(`/events/${id}`);
    return withId(data.data ?? data);
  },

  createEvent: (eventData: AnyRecord) =>
    api.post('/events', eventData).then((r) => r.data),

  toggleMembership: (eventId: string) =>
    api.post(`/events/${eventId}/join`).then((r) => r.data),

  getJoinedEventIds: async (): Promise<string[]> => {
    const { data } = await api.get('/events/me/joined');
    const list = toList(data, 'joined', 'events', 'data');
    return list.map((e) => e._id ?? e.id ?? '').filter(Boolean);
  },
};

// ── Faza API ──────────────────────────────────────────────────────────────────

export const fazaAPI = {
  getRequests: async (communityId?: string) => {
    const { data } = await api.get('/faza-requests', { params: { communityId } });
    return toList(data, 'requests', 'data').map(withId);
  },

  createRequest: (payload: AnyRecord) =>
    api.post('/faza-requests', payload).then((r) => r.data),

  answerRequest: (requestId: string, answer: string) =>
    api.post(`/faza-requests/${requestId}/answer`, { answer }).then((r) => r.data),
};

// ── TravelPost API ────────────────────────────────────────────────────────────

export const travelPostAPI = {
  getPosts: async (communityId?: string) => {
    const { data } = await api.get('/travel-posts', { params: { communityId } });
    return toList(data, 'posts', 'data').map(withId);
  },

  createPost: (payload: AnyRecord) =>
    api.post('/travel-posts', payload).then((r) => r.data),

  joinPost: (postId: string) =>
    api.post(`/travel-posts/${postId}/join`).then((r) => r.data),
};

// ── Thread API ────────────────────────────────────────────────────────────────

export const threadAPI = {
  getThreads: async (communityId: string) => {
    const { data } = await api.get(`/communities/${communityId}/threads`);
    return toList(data, 'threads', 'data').map(withId);
  },

  createThread: async (communityId: string, payload: AnyRecord) => {
    const { data } = await api.post(`/communities/${communityId}/threads`, payload);
    return withId(data.data ?? data);
  },

  addReply: async (communityId: string, threadId: string, payload: { text: string; imageUrl?: string }) => {
    const { data } = await api.post(`/communities/${communityId}/threads/${threadId}/replies`, payload);
    return withId(data.data ?? data);
  },

  toggleReaction: async (communityId: string, threadId: string, emoji: string) => {
    const { data } = await api.post(`/communities/${communityId}/threads/${threadId}/reactions`, { emoji });
    return withId(data.data ?? data);
  },

  votePoll: async (communityId: string, threadId: string, optionIndex: number) => {
    const { data } = await api.post(`/communities/${communityId}/threads/${threadId}/vote`, { optionIndex });
    return withId(data.data ?? data);
  },

  togglePin: async (communityId: string, threadId: string) => {
    const { data } = await api.patch(`/communities/${communityId}/threads/${threadId}/pin`);
    return withId(data.data ?? data);
  },
};

// ── Review API ────────────────────────────────────────────────────────────────

export const reviewAPI = {
  getReviews: (params?: { targetType?: string; targetId?: string }) =>
    api.get('/reviews', { params }).then((r) => r.data),

  createReview: (review: AnyRecord) => api.post('/reviews', review).then((r) => r.data),

  updateReview: (id: string, updates: AnyRecord) =>
    api.patch(`/reviews/${id}`, updates).then((r) => r.data),

  deleteReview: (id: string) => api.delete(`/reviews/${id}`).then((r) => r.data),
};

// ── Favorite API ──────────────────────────────────────────────────────────────

export const favoriteAPI = {
  getFavorites: () => api.get('/favorites').then((r) => r.data),

  addFavorite: (placeId: string) =>
    api.post('/favorites', { placeId }).then((r) => r.data),

  removeFavorite: (placeId: string) =>
    api.delete(`/favorites/${placeId}`).then((r) => r.data),
};

// ── Private Trip API ──────────────────────────────────────────────────────────

export const privateTripAPI = {
  create: (payload: { title: string; startDate?: string; endDate?: string; inviteIds?: string[] }) =>
    api.post('/group-trips/private', payload).then((r) => r.data),

  getMyTrips: async () => {
    const { data } = await api.get('/group-trips/mine/private');
    return Array.isArray(data) ? data : [];
  },

  getMessages: async (tripId: string) => {
    const { data } = await api.get('/messages', { params: { groupTripId: tripId } });
    return toList(data, 'messages').map(mapMessage);
  },

  sendMessage: async (tripId: string, content: string) => {
    const { data } = await api.post('/messages', { groupTripId: tripId, content, type: 'text' });
    return { ...mapMessage(data), userName: data.senderId?.name ?? 'Me', text: data.content ?? content };
  },

  getExpenses: async (tripId: string) => {
    const { data } = await api.get('/expenses', { params: { groupTripId: tripId } });
    return toList(data).map((e) => mapExpense(e));
  },

  addExpense: async (
    tripId: string,
    description: string,
    amount: number,
    payerId: string,
    memberIds: string[]
  ) => {
    const { data } = await api.post('/expenses', {
      groupTripId: tripId, description, amount,
      currency: 'SAR', category: 'other', splitType: 'equal',
      involvedMemberIds: memberIds,
    });
    return mapExpense(data, { payerId, description, amount });
  },

  searchUsers: async (q: string) => {
    const { data } = await api.get('/users/search', { params: { q } });
    return Array.isArray(data) ? data.map(withId) : [];
  },
};

// ── Social Auth API ───────────────────────────────────────────────────────────

export const socialAuthAPI = {
  login: (provider: 'google' | 'facebook', token: string) =>
    api.post('/auth/social', { provider, token }).then((r) => r.data),
};

// ── Google Places API ─────────────────────────────────────────────────────────

export interface GooglePlacePhoto {
  url: string;
  width: number;
  height: number;
}

export interface GooglePlaceReview {
  author: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
}

export interface GooglePlaceDetails {
  googlePlaceId: string | null;
  rating?: number;
  userRatingCount?: number;
  photos: GooglePlacePhoto[];
  reviews: GooglePlaceReview[];
  address?: string;
  website?: string;
  phone?: string;
}

export const googlePlacesAPI = {
  getDetails: (name: string, city?: string): Promise<GooglePlaceDetails> =>
    api.get('/google-places/details', { params: { name, city } }).then((r) => r.data),

  photoSrc: (proxyPath: string): string => `${API_URL}${proxyPath}`,
};

// ── AI API ────────────────────────────────────────────────────────────────────

export const aiAPI = {
  generateContent: (prompt: string, systemInstruction?: string, base64Image?: string) =>
    api.post('/ai/generate', { prompt, systemInstruction, base64Image }).then((r) => r.data),
};

export default api;