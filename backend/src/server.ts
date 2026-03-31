import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors, { CorsOptions } from 'cors'; // ✅ استيراد نوع CorsOptions صراحةً
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDatabase } from './config/database';
import routes from './routes';
import itineraryRoutes from './routes/itineraryRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { verifyToken } from './utils/jwt';

const app = express();

// ✅ PRO TIP: ضروري جداً لحساب الـ IP الحقيقي إذا رفعت التطبيق على السحابة (Render/AWS)
app.set('trust proxy', 1);

const httpServer = createServer(app);

// ==========================================
// 🛡️ CORS Configuration (TypeScript Proof)
// ==========================================
// قمنا بتعريف الروابط كمصفوفة نصوص صريحة (Array of Strings) لكي لا يعترض TypeScript أبداً
const allowedOrigins: string[] = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, 'http://localhost:5173']
  : ['http://localhost:5173'];

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
// ✅ توحيد إعدادات الـ CORS
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
};

// ==========================================
// 🔌 Socket.IO Initialization
// ==========================================
const io = new Server(httpServer, {
  cors: corsOptions
});

// ==========================================
// 🛡️ Global Middlewares (دروع الحماية)
// ==========================================
app.use(helmet());
app.use(cors(corsOptions)); // استخدام نفس إعدادات CORS للـ Express
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ✅ حماية السيرفر من هجمات الـ Payload الضخمة
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// 🚦 Rate Limiting (حماية من الـ DDoS)
// ==========================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000', 10), // high limit for development
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production', // disable in development
});
app.use('/api/', limiter);

// ==========================================
// 🩺 Health Check (فحص صحة السيرفر)
// ==========================================
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==========================================
// 🔀 API Routes (المسارات)
// ==========================================
// ✅ جعل الـ Socket متاحاً داخل الـ Controllers
app.set('io', io);

app.use('/api/v1', routes);
app.use('/api/v1/itineraries', itineraryRoutes);

// ==========================================
// 🚨 Error Handling (معالجة الأخطاء)
// ==========================================
app.use(notFound);
app.use(errorHandler);

// ==========================================
// 🔌 Socket.IO Real-time Engine
// ==========================================
io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const payload = verifyToken(token);
    socket.data.user = payload;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket: Socket) => {
  const userId = socket.data.user?.userId;
  console.log(`🟢 [Socket] Client connected: ${socket.id} | User: ${userId}`);

  if (userId) {
    socket.join(`user:${userId}`);
  }

  socket.on('group:join', (groupTripId: string) => {
    if (!groupTripId) return;
    socket.join(`group:${groupTripId}`);
    console.log(`👥 [Socket] User ${userId} joined group ${groupTripId}`);
  });

  socket.on('group:leave', (groupTripId: string) => {
    if (!groupTripId) return;
    socket.leave(`group:${groupTripId}`);
    console.log(`👋 [Socket] User ${userId} left group ${groupTripId}`);
  });

  socket.on('message:send', async (data: { groupTripId: string; content: string }) => {
    if (!data.groupTripId || !data.content) return;
    io.to(`group:${data.groupTripId}`).emit('message:receive', {
      senderId: userId,
      content: data.content,
      groupTripId: data.groupTripId,
      createdAt: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log(`🔴 [Socket] Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// 🚀 Server Bootstrapper & Graceful Shutdown
// ==========================================
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDatabase();

    const server = httpServer.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🚀 Tripo Backend is LIVE!`);
      console.log(`==================================================`);
      console.log(`📡 API:         http://localhost:${PORT}/api/v1`);
      console.log(`🔌 WebSocket:   ws://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`==================================================\n`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('💤 HTTP server closed.');
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          console.log('🗄️ Database connection closed safely.');
        }
        process.exit(0);
      });

      setTimeout(() => {
        console.error('🚨 Could not close connections in time, forcefully shutting down!');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, io };