import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  language: z.enum(['en', 'ar']).default('en'),
  smartProfile: z.object({
    interests: z.array(z.string()).default([]),
    preferredBudget: z.enum(['free', 'low', 'medium', 'high']).default('medium'),
    activityStyles: z.array(z.string()).default([]),
    typicalFreeTimeWindow: z.number().min(30).default(180),
    mood: z.string().optional(),
    city: z.string().min(1, 'City is required')
  })
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().optional(),
  language: z.enum(['en', 'ar']).optional()
});

export const updateSmartProfileSchema = z.object({
  interests: z.array(z.string()).optional(),
  preferredBudget: z.enum(['free', 'low', 'medium', 'high']).optional(),
  activityStyles: z.array(z.string()).optional(),
  typicalFreeTimeWindow: z.number().min(30).optional(),
  mood: z.string().optional(),
  city: z.string().optional()
});

export const createItinerarySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  estimatedDuration: z.number().min(30, 'Duration must be at least 30 minutes'),
  estimatedCost: z.number().min(0),
  distance: z.number().min(0),
  city: z.string().min(1, 'City is required'),
  places: z.array(z.object({
    placeId: z.string(),
    order: z.number(),
    timeSlot: z.string().optional(),
    notes: z.string().optional()
  })).min(1, 'At least one place is required'),
  notes: z.string().optional()
});

export const createReviewSchema = z.object({
  targetType: z.enum(['place', 'itinerary']),
  targetId: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  mediaRefs: z.array(z.string().url()).optional()
});

export const createGroupTripSchema = z.object({
  baseItineraryId: z.string(),
  title: z.string().min(3)
});

export const createExpenseSchema = z.object({
  groupTripId: z.string(),
  amount: z.number().min(0),
  description: z.string().min(1),
  involvedMemberIds: z.array(z.string()).min(1)
});

export const createMessageSchema = z.object({
  groupTripId: z.string(),
  content: z.string().min(1)
});

export const createReportSchema = z.object({
  targetType: z.enum(['itinerary', 'message', 'session', 'campsite']),
  targetId: z.string(),
  reason: z.string().min(1),
  description: z.string().optional()
});
