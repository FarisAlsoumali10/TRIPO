/**
 * One-time migration: renames `stripeSessionId` → `providerSessionId` on all Payment documents.
 * Run once after deploying the updated Payment model, then delete this file.
 *
 * Usage:
 *   npx ts-node -e "require('./scripts/migratePaymentSessions')"
 * or via ts-node directly:
 *   npx ts-node backend/scripts/migratePaymentSessions.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in environment');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  const collection = db.collection('payments');

  const result = await collection.updateMany(
    { stripeSessionId: { $exists: true } },
    [
      { $set: { providerSessionId: '$stripeSessionId', provider: 'stripe' } },
      { $unset: 'stripeSessionId' },
    ],
  );

  console.log(`✅ Migrated ${result.modifiedCount} Payment documents`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
