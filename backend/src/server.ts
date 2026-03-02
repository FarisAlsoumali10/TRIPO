import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database';
import routes from './routes';
import itineraryRoutes from './routes/itineraryRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { verifyToken } from './utils/jwt';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', routes);
app.use('/api/v1/itineraries', itineraryRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Socket.IO setup with authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const payload = verifyToken(token);
    socket.data.user = payload;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.user?.userId;
  console.log('Client connected:', socket.id, 'User:', userId);

  // Join user's personal notification room
  if (userId) {
    socket.join(`user:${userId}`);
  }

  // Join group trip chat room
  socket.on('group:join', (groupTripId: string) => {
    socket.join(`group:${groupTripId}`);
    console.log(`User ${userId} joined group ${groupTripId}`);
  });

  // Leave group trip chat room
  socket.on('group:leave', (groupTripId: string) => {
    socket.leave(`group:${groupTripId}`);
    console.log(`User ${userId} left group ${groupTripId}`);
  });

  // Send message (handled via REST API, but can be done via socket too)
  socket.on('message:send', async (data: { groupTripId: string; content: string }) => {
    // Emit to room
    io.to(`group:${data.groupTripId}`).emit('message:receive', {
      senderId: userId,
      content: data.content,
      groupTripId: data.groupTripId,
      createdAt: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api/v1`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, io };
