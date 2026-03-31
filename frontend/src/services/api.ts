import axios from 'axios';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!error.config?.headers?.Authorization;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect to auth if the request had a token that was rejected (expired/invalid)
      // Guests (no token) should not be redirected — let the screen handle it gracefully
      if (hadToken) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// Auth API
// ==========================================
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  register: async (registerData: RegisterData): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/register', registerData);
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await api.get('/profile');
    return data;
  },

  updateProfile: async (updates: Partial<User>): Promise<User> => {
    const { data } = await api.patch('/profile', updates);
    return data;
  },

  updateSmartProfile: async (smartProfile: Partial<User['smartProfile']>) => {
    const { data } = await api.patch('/profile/smart-profile', smartProfile);
    return data;
  },

  getMe: (): Promise<User> => api.get('/auth/me').then(r => r.data),
};

// ==========================================
// Itinerary API
// ==========================================
export const itineraryAPI = {
  getFeed: async (page = 1, limit = 20) => {
    const { data } = await api.get('/itineraries', { params: { page, limit } });
    const rawItineraries = Array.isArray(data) ? data : (data.itineraries || data.data || []);

    return rawItineraries.map((item: any) => ({
      ...item,
      id: item._id || item.id,
    }));
  },

  getItineraries: async (params?: { page?: number; limit?: number; status?: string }) => {
    const { data } = await api.get('/itineraries', { params });
    const rawItineraries = Array.isArray(data) ? data : (data.itineraries || data.data || []);
    return rawItineraries.map((item: any) => ({ ...item, id: item._id || item.id }));
  },

  getItinerary: async (id: string) => {
    const { data } = await api.get(`/itineraries/${id}`);
    return data;
  },

  createItinerary: async (itinerary: any) => {
    const { data } = await api.post('/itineraries', itinerary);
    return data;
  },

  updateItinerary: async (id: string, updates: any) => {
    const { data } = await api.patch(`/itineraries/${id}`, updates);
    return data;
  },

  deleteItinerary: async (id: string) => {
    const { data } = await api.delete(`/itineraries/${id}`);
    return data;
  },
};

// ==========================================
// Place API
// ==========================================
export const placeAPI = {
  getPlaces: async (params?: any) => {
    const { data } = await api.get('/places', { params });
    // تطبيق الاستخراج الآمن مثل الرحلات
    const rawPlaces = Array.isArray(data) ? data : (data.places || data.data || []);
    return rawPlaces.map((item: any) => ({
      ...item,
      id: item._id || item.id,
    }));
  },

  getPlace: async (id: string) => {
    const { data } = await api.get(`/places/${id}`);
    return data;
  },

  createPlace: (data: any) => api.post('/places', data).then(r => r.data),

  updatePlace: (id: string, updates: any) => api.patch(`/places/${id}`, updates).then(r => r.data),
};

// ==========================================
// Group Trip API
// ==========================================
const isMongoId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export const groupTripAPI = {
  create: async (baseItineraryId: string, title: string) => {
    const { data } = await api.post('/group-trips', { baseItineraryId, title });
    return data;
  },

  getMessages: async (groupTripId: string) => {
    const { data } = await api.get('/messages', { params: { groupTripId } });
    const raw = data.messages || data || [];
    return raw.map((m: any) => ({
      id: m._id || m.id,
      userId: m.senderId?._id || m.senderId || '',
      userName: m.senderId?.name || 'Unknown',
      text: m.content || m.text || '',
      timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    }));
  },

  sendMessage: async (groupTripId: string, content: string) => {
    const { data } = await api.post('/messages', { groupTripId, content, type: 'text' });
    return {
      id: data._id || data.id,
      userId: data.senderId?._id || data.senderId || '',
      userName: data.senderId?.name || 'Me',
      text: data.content || content,
      timestamp: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
    };
  },

  getExpenses: async (groupTripId: string) => {
    const { data } = await api.get('/expenses', { params: { groupTripId } });
    const raw = Array.isArray(data) ? data : [];
    return raw.map((e: any) => ({
      id: e._id || e.id,
      payerId: e.payerId?._id || e.payerId || '',
      description: e.description,
      amount: e.amount,
      timestamp: e.createdAt ? new Date(e.createdAt).getTime() : Date.now(),
    }));
  },

  addExpense: async (groupTripId: string, description: string, amount: number, payerId: string, memberIds: string[]) => {
    const involvedMemberIds = memberIds.filter(isMongoId);
    if (isMongoId(payerId) && !involvedMemberIds.includes(payerId)) {
      involvedMemberIds.push(payerId);
    }
    const { data } = await api.post('/expenses', {
      groupTripId,
      description,
      amount,
      currency: 'SAR',
      category: 'other',
      splitType: 'equal',
      involvedMemberIds: involvedMemberIds.length > 0 ? involvedMemberIds : [payerId],
    });
    return {
      id: data._id || data.id,
      payerId: data.payerId?._id || data.payerId || payerId,
      description: data.description || description,
      amount: data.amount || amount,
      timestamp: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
    };
  },
};

// ==========================================
// Community API (جديد لدعم شاشة المجتمعات)
// ==========================================
export const communityAPI = {
  getCommunities: async () => {
    const { data } = await api.get('/communities');
    const rawData = Array.isArray(data) ? data : (data.communities || data.data || []);
    return rawData.map((item: any) => ({ ...item, id: item._id || item.id }));
  },

  getEvents: async (communityId?: string) => {
    const { data } = await api.get('/events', { params: { communityId } });
    const rawData = Array.isArray(data) ? data : (data.events || data.data || []);
    return rawData.map((item: any) => ({ ...item, id: item._id || item.id }));
  },

  getFazaRequests: async (communityId?: string) => {
    const { data } = await api.get('/faza-requests', { params: { communityId } });
    const rawData = Array.isArray(data) ? data : (data.requests || data.data || []);
    return rawData.map((item: any) => ({ ...item, id: item._id || item.id }));
  }
};

// ==========================================
// Rental API (جديد لدعم الخريطة وتأجير الكشتات)
// ==========================================
export const rentalAPI = {
  getRentals: async (params?: any) => {
    const { data } = await api.get('/rentals', { params });
    const rawData = Array.isArray(data) ? data : (data.rentals || data.data || []);
    return rawData.map((item: any) => ({ ...item, id: item._id || item.id }));
  },

  createRental: async (rentalData: any) => {
    const { data } = await api.post('/rentals', rentalData);
    return data;
  }
};

// ==========================================
// Review API
// ==========================================
export const reviewAPI = {
  getReviews: async (params?: { targetType?: string; targetId?: string }) => {
    const { data } = await api.get('/reviews', { params });
    return data;
  },

  createReview: async (review: any) => {
    const { data } = await api.post('/reviews', review);
    return data;
  },

  updateReview: async (id: string, updates: any) => {
    const { data } = await api.patch(`/reviews/${id}`, updates);
    return data;
  },

  deleteReview: async (id: string) => {
    const { data } = await api.delete(`/reviews/${id}`);
    return data;
  },
};

// ==========================================
// Favorite API
// ==========================================
export const favoriteAPI = {
  getFavorites: async () => {
    const { data } = await api.get('/favorites');
    return data;
  },

  addFavorite: async (placeId: string) => {
    const { data } = await api.post('/favorites', { placeId });
    return data;
  },

  removeFavorite: async (placeId: string) => {
    const { data } = await api.delete(`/favorites/${placeId}`);
    return data;
  },
};

// ==========================================
// Tour API
// ==========================================
export const tourAPI = {
  getTours: async (params?: { category?: string }) => {
    const { data } = await api.get('/tours', { params });
    const raw = Array.isArray(data) ? data : (data.tours || data.data || []);
    return raw.map((t: any) => ({ ...t, id: t._id || t.id }));
  },
  getTour: async (id: string) => {
    const { data } = await api.get(`/tours/${id}`);
    return { ...data, id: data._id || data.id };
  },
  bookTour: async (tourId: string, payload: { date: string; guests: number; paymentDetails?: any }) => {
    const { data } = await api.post(`/tours/${tourId}/book`, payload);
    return data; // { booking, groupTrip }
  },
};

// ==========================================
// Private Trip API
// ==========================================
export const privateTripAPI = {
  create: async (payload: { title: string; startDate?: string; endDate?: string; inviteIds?: string[] }) => {
    const { data } = await api.post('/group-trips/private', payload);
    return data;
  },

  getMyTrips: async () => {
    const { data } = await api.get('/group-trips/mine/private');
    return Array.isArray(data) ? data : [];
  },

  getMessages: async (tripId: string) => {
    const { data } = await api.get('/messages', { params: { groupTripId: tripId } });
    const raw = data.messages || data || [];
    return raw.map((m: any) => ({
      id: m._id || m.id,
      userId: m.senderId?._id || m.senderId || '',
      userName: m.senderId?.name || 'Unknown',
      text: m.content || m.text || '',
      timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    }));
  },

  sendMessage: async (tripId: string, content: string) => {
    const { data } = await api.post('/messages', { groupTripId: tripId, content, type: 'text' });
    return {
      id: data._id || data.id,
      userId: data.senderId?._id || data.senderId || '',
      userName: data.senderId?.name || 'Me',
      text: data.content || content,
      timestamp: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
    };
  },

  getExpenses: async (tripId: string) => {
    const { data } = await api.get('/expenses', { params: { groupTripId: tripId } });
    const raw = Array.isArray(data) ? data : [];
    return raw.map((e: any) => ({
      id: e._id || e.id,
      payerId: e.payerId?._id || e.payerId || '',
      description: e.description,
      amount: e.amount,
      timestamp: e.createdAt ? new Date(e.createdAt).getTime() : Date.now(),
    }));
  },

  addExpense: async (tripId: string, description: string, amount: number, payerId: string, memberIds: string[]) => {
    const { data } = await api.post('/expenses', {
      groupTripId: tripId,
      description,
      amount,
      currency: 'SAR',
      category: 'other',
      splitType: 'equal',
      involvedMemberIds: memberIds,
    });
    return {
      id: data._id || data.id,
      payerId: data.payerId?._id || data.payerId || payerId,
      description: data.description || description,
      amount: data.amount || amount,
      timestamp: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
    };
  },

  searchUsers: async (q: string) => {
    const { data } = await api.get('/users/search', { params: { q } });
    return Array.isArray(data) ? data.map((u: any) => ({ ...u, id: u._id || u.id })) : [];
  },
};

export default api;