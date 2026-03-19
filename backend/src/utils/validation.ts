import { z } from 'zod';

// ==========================================
// 🛡️ Custom Validators
// ==========================================
// التحقق من أن الـ ID هو MongoDB ObjectId حقيقي (24 character hex string)
const objectIdValidator = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');

// ==========================================
// 👤 Auth & User Profiles
// ==========================================

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'), // 8 أحرف هو المعيار الأمني الحديث
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  language: z.enum(['en', 'ar']).default('en'),
  smartProfile: z.object({
    interests: z.array(z.string()).default([]),
    preferredBudget: z.enum(['free', 'low', 'medium', 'high']).default('medium'),
    activityStyles: z.array(z.string()).default([]),
    typicalFreeTimeWindow: z.number().min(30).default(180),
    mood: z.string().optional(),
    city: z.string().trim().min(1, 'City is required'),
    travelVibe: z.enum(['chill', 'adventurous', 'cultural', 'foodie']).optional(),
    favoriteSeason: z.enum(['winter', 'spring', 'summer', 'autumn']).optional()
  })
}).strict(); // يمنع إرسال أي حقول خبيثة غير معرفة هنا

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  avatar: z.string().url('Invalid avatar URL format').optional(),
  language: z.enum(['en', 'ar']).optional(),
  appTheme: z.enum(['light', 'dark', 'system']).optional(),
  bio: z.string().trim().max(150).optional()
}).strict();

export const updateSmartProfileSchema = z.object({
  interests: z.array(z.string()).optional(),
  preferredBudget: z.enum(['free', 'low', 'medium', 'high']).optional(),
  activityStyles: z.array(z.string()).optional(),
  typicalFreeTimeWindow: z.number().min(30).optional(),
  mood: z.string().optional(),
  city: z.string().trim().optional(),
  travelVibe: z.enum(['chill', 'adventurous', 'cultural', 'foodie']).optional(),
  favoriteSeason: z.enum(['winter', 'spring', 'summer', 'autumn']).optional()
}).strict();

// ==========================================
// 🗺️ Itineraries & Planning
// ==========================================

export const createItinerarySchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  estimatedDuration: z.number().min(30, 'Duration must be at least 30 minutes'),
  estimatedCost: z.number().min(0),
  distance: z.number().min(0),
  city: z.string().trim().min(1, 'City is required'),
  places: z.array(z.object({
    placeId: objectIdValidator,
    order: z.number().int().min(0),
    timeSlot: z.string().optional(),
    notes: z.string().trim().optional()
  })).min(1, 'At least one place is required'),
  notes: z.string().trim().optional()
}).strict();

// ==========================================
// 👥 Social & Group Trips
// ==========================================

export const createGroupTripSchema = z.object({
  baseItineraryId: objectIdValidator,
  title: z.string().trim().min(3),
  description: z.string().trim().max(1000).optional(),
  coverImage: z.string().url().optional(),
  startDate: z.string().datetime().optional(), // التحقق من صيغة التاريخ
  endDate: z.string().datetime().optional(),
  estimatedBudget: z.number().min(0).optional()
}).strict();

export const createExpenseSchema = z.object({
  groupTripId: objectIdValidator,
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().length(3).default('SAR'), // رمز العملة القياسي
  category: z.enum(['food', 'transport', 'accommodation', 'activities', 'shopping', 'other']).default('other'),
  description: z.string().trim().min(1),
  splitType: z.enum(['equal', 'percentage', 'exact']).default('equal'),
  receiptUrl: z.string().url().optional(),
  involvedMemberIds: z.array(objectIdValidator).min(1, 'Must involve at least one member')
}).strict();

export const createMessageSchema = z.object({
  groupTripId: objectIdValidator,
  content: z.string().trim().min(1),
  type: z.enum(['text', 'system', 'image', 'location']).default('text')
}).strict();

// ==========================================
// ⭐ Reviews, Reports & Trust
// ==========================================

export const createReviewSchema = z.object({
  targetType: z.enum(['place', 'itinerary', 'campsite', 'session']),
  targetId: objectIdValidator,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional(),
  comment: z.string().trim().max(1000).optional(),
  mediaRefs: z.array(z.string().url()).optional()
}).strict();

export const createReportSchema = z.object({
  targetType: z.enum(['itinerary', 'message', 'session', 'campsite', 'user', 'place', 'review']),
  targetId: objectIdValidator,
  reason: z.string().trim().min(1),
  description: z.string().trim().max(1000).optional()
}).strict();