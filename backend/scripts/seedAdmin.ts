import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models';
import { hashPassword } from '../src/utils/password';

const ADMIN_EMAIL = 'admin@tripo.sa';
const ADMIN_PASSWORD = 'Admin1234!';
const ADMIN_NAME = 'Tripo Admin';

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB');

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      console.log(`✅  Existing user "${ADMIN_EMAIL}" upgraded to admin.`);
    } else {
      console.log(`ℹ️   Admin account already exists: ${ADMIN_EMAIL}`);
    }
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await User.create({
    email: ADMIN_EMAIL,
    passwordHash,
    name: ADMIN_NAME,
    role: 'admin',
    language: 'en',
    appTheme: 'light',
    tripoPoints: 0,
    explorerLevel: 'Admin',
    isEmailVerified: true,
    smartProfile: {
      interests: [],
      preferredBudget: 'medium',
      activityStyles: [],
      typicalFreeTimeWindow: 180,
      city: 'Riyadh',
    },
  });

  console.log('✅  Admin account created!');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);

  await mongoose.disconnect();
}

seedAdmin().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
