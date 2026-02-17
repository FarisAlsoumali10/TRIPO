import axios from 'axios';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
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
};

// Itinerary API
export const itineraryAPI = {
  getFeed: async (page = 1, limit = 20) => {
    const { data } = await api.get('/itineraries/feed', { params: { page, limit } });
    return data;
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

// Place API
export const placeAPI = {
  getPlaces: async (params?: any) => {
    const { data } = await api.get('/places', { params });
    return data;
  },

  getPlace: async (id: string) => {
    const { data } = await api.get(`/places/${id}`);
    return data;
  },
};

// Review API
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

// Favorite API
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

export default api;
