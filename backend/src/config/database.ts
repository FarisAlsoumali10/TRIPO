import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tripo';

    // Force IPv4 (family: 4) to fix Atlas DNS resolution issues
    await mongoose.connect(mongoUri, { 
      family: 4,
      serverSelectionTimeoutMS: 15000 // Timeout early to show descriptive error rather than hanging
    });

    console.log('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

  } catch (error: any) {
    console.error('❌ MongoDB connection failed. Please verify your connection string and ensure your IP is whitelisted in MongoDB Atlas or network.');
    console.error('Error Details:', error.message || error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
