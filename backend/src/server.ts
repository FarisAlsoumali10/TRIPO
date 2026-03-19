import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose'; // ✅ للإغلاق الآمن لقاعدة البيانات
import { connectDatabase } from './config/database';
import routes from './routes';
import itineraryRoutes from './routes/itineraryRoutes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { verifyToken } from './utils/jwt';

const app = express();

// ✅ PRO TIP: ضروري جداً لحساب الـ IP الحقيقي إذا رفعت التطبيق على Render/Heroku/AWS
app.set('trust proxy', 1);

const httpServer = createServer(app);

// ✅ توحيد إعدادات الـ CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
};

const io = new Server(httpServer, {
  cors: corsOptions
});

// ==========================================
// 🛡️ Global Middlewares (دروع الحماية)
// ==========================================
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
// ✅ حماية السيرفر من هجمات الـ Payload الضخمة
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// 🚦 Rate Limiting (حماية من الـ DDoS)
// ==========================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 دقيقة
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: { success: false, error: 'طلبات كثيرة جداً من هذا الجهاز، يرجى المحاولة لاحقاً' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ==========================================
// 🩺 Health Check (فحص صحة السيرفر)
// ==========================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(), // ✅ لمعرفة كم ثانية السيرفر يعمل بدون توقف
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==========================================
// 🔀 API Routes (المسارات)
// ==========================================
// ✅ جعل الـ Socket متاحاً داخل الـ Controllers لاستخدامه في إرسال الإشعارات
app.set('io', io);

app.use('/api/v1', routes);
app.use('/api/v1/itineraries', itineraryRoutes); // (يفضل مستقبلاً دمجها داخل routes/index.ts)

// ==========================================
// 🚨 Error Handling (معالجة الأخطاء)
// ==========================================
app.use(notFound);
app.use(errorHandler);

// ==========================================
// 🔌 Socket.IO Real-time Engine (محرك الوقت الفعلي)
// ==========================================
io.use((socket: Socket, next) => {
  // ✅ دعم التقاط التوكن سواء تم إرساله في الـ auth object أو الـ headers
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
    socket.join(`user:${userId}`); // غرفة الإشعارات الشخصية
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

  // ✅ استقبال الرسائل (يفضل أن تمر عبر الـ REST API لحفظها في الداتا بيس، ثم تبثها عبر الـ Socket)
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

    // ✅ PRO FEATURE: الإغلاق الآمن للسيرفر (Graceful Shutdown)
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

      // إغلاق إجباري بعد 10 ثوانٍ إذا طالت العملية
      setTimeout(() => {
        console.error('🚨 Could not close connections in time, forcefully shutting down!');
        process.exit(1);
      }, 10000);
    };

    // الاستماع لأوامر الإغلاق من نظام التشغيل (مثل ضغط Ctrl+C)
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export { app, io };