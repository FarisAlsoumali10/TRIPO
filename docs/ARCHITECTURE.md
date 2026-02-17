# Tripo Architecture

## Overview

Tripo follows a 3-layer MVC architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│          Frontend (View)                │
│  React + TypeScript + Tailwind CSS      │
└──────────────┬──────────────────────────┘
               │ REST API + Socket.IO
┌──────────────┴──────────────────────────┐
│      Backend (Controller/Services)      │
│    Express.js + TypeScript + Socket.IO  │
└──────────────┬──────────────────────────┘
               │ Mongoose ODM
┌──────────────┴──────────────────────────┐
│         Database (Model)                │
│          MongoDB (NoSQL)                │
└─────────────────────────────────────────┘
```

## Backend Architecture

### Layers

1. **Routes Layer** (`src/routes/`)
   - Defines API endpoints
   - Maps HTTP methods to controllers
   - Applies middleware (auth, validation)

2. **Controllers Layer** (`src/controllers/`)
   - Handles HTTP requests and responses
   - Input validation
   - Delegates business logic to services
   - Returns formatted responses

3. **Services Layer** (`src/services/`)
   - Business logic implementation
   - Complex algorithms (recommendation, split budget)
   - Orchestrates multiple model operations
   - Reusable across controllers

4. **Models Layer** (`src/models/`)
   - Mongoose schemas and models
   - Data validation
   - Database queries
   - 13 collections (User, Place, Itinerary, etc.)

5. **Middleware Layer** (`src/middleware/`)
   - Authentication (JWT verification)
   - Authorization (role-based access)
   - Request validation (Zod schemas)
   - Error handling

### Key Services

#### Recommendation Service
Algorithm for personalized feed (For You):
- **Feasibility Score** (40%): time window + budget match
- **Interest Score** (30%): category tags overlap
- **Mood Score** (15%): activity style alignment
- **Quality Score** (15%): ratings + verified flag

#### Split Budget Service
Fair expense distribution:
1. Calculate total expenses
2. Track paid vs owes per member
3. Compute net balances
4. Generate settlements using greedy algorithm

### Real-time Features

Socket.IO implementation:
- **Authentication**: JWT verification on connection
- **Rooms**: User-specific (notifications) + Group-specific (chat)
- **Events**:
  - `group:join` / `group:leave` - Join/leave chat room
  - `message:send` / `message:receive` - Real-time messaging
  - `notification` - Push notifications

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── auth/           # Login, Register
│   ├── profile/        # Smart Profile, User Profile
│   ├── feed/           # For You feed, Itinerary cards
│   ├── itinerary/      # Create, View, Edit
│   ├── group/          # Group trips, Chat
│   ├── expenses/       # Expense tracking, Split view
│   ├── admin/          # Admin dashboard, Moderation
│   ├── common/         # Reusable UI components
│   └── layout/         # Layout, Navigation
├── pages/              # Route-level components
├── contexts/           # React Context (Auth, Theme)
├── services/           # API clients, Socket.IO
├── hooks/              # Custom React hooks
└── utils/              # Helpers, formatters
```

### State Management

- **Auth State**: React Context + localStorage
- **Server State**: React Query (caching, refetch)
- **Local State**: useState, useReducer
- **Real-time State**: Socket.IO events

### API Communication

- **REST API**: Axios with interceptors
- **WebSocket**: Socket.IO client
- **Auth**: JWT token in Authorization header
- **Error Handling**: Global interceptor + local try-catch

## Database Schema

### Collections

1. **users** - User accounts and smart profiles
2. **places** - Points of interest catalog
3. **itineraries** - Reusable trip plans
4. **favorites** - User-saved places
5. **reviews** - Ratings and comments
6. **groupTrips** - Collaborative trip planning
7. **expenses** - Shared expense tracking
8. **messages** - Group chat history
9. **notifications** - User notifications
10. **reports** - Content moderation reports
11. **sessions** - Marketplace activities
12. **campsites** - Marketplace accommodations
13. **bookings** - Marketplace reservations

### Indexes

Performance-critical indexes:
- `users.email` (unique)
- `places.city` + `places.coordinates` (2dsphere)
- `itineraries.userId` + `itineraries.city`
- `favorites.(userId, placeId)` (compound unique)
- `messages.groupTripId`
- `notifications.(userId, read)`

## Security

### Authentication & Authorization

- JWT tokens (7-day expiration)
- bcrypt password hashing (10 rounds)
- Role-based access control (user, admin, host)
- Protected routes with middleware

### Input Validation

- Zod schemas for request validation
- Mongoose schema validation
- XSS prevention (sanitization)
- SQL injection prevention (NoSQL with Mongoose)

### Rate Limiting

- Express rate limiter
- 100 requests per 15 minutes per IP
- Applied to all `/api` routes

## Scalability Considerations

### Current Implementation
- Monolithic architecture
- Single MongoDB instance
- In-memory Socket.IO

### Future Improvements
- Microservices for recommendation engine
- MongoDB sharding by city
- Redis for Socket.IO adapter (horizontal scaling)
- CDN for static assets
- Elasticsearch for search

## Performance Optimizations

1. **Database**:
   - Strategic indexes
   - Aggregated rating summaries
   - Pagination (20 items per page)

2. **API**:
   - Response compression
   - Request caching headers
   - Query optimization (select specific fields)

3. **Frontend**:
   - React Query caching (5min stale time)
   - Lazy loading (React.lazy)
   - Bundle splitting
   - Image optimization

## Deployment

### Development
- Docker Compose for local setup
- Hot reload (tsx for backend, Vite for frontend)

### Production (Recommended)
- **Backend**: Node.js on cloud VM (AWS EC2, DigitalOcean)
- **Database**: MongoDB Atlas
- **Frontend**: Vercel, Netlify, or S3 + CloudFront
- **Environment**: Separate .env files
- **Monitoring**: PM2, CloudWatch

## Testing Strategy

- **Unit Tests**: Services, utilities
- **Integration Tests**: API endpoints
- **Component Tests**: React components
- **E2E Tests**: Critical user flows (future)
