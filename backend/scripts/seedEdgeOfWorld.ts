import 'dotenv/config';
import mongoose from 'mongoose';
import { Place, Itinerary, User } from '../src/models';

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tripo';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  // 1. Insert place if it doesn't exist
  let place = await Place.findOne({ name: 'Edge of the World' });

  if (!place) {
    place = await Place.create({
      name: 'Edge of the World',
      city: 'Riyadh',
      description: 'A dramatic cliff viewpoint on the Tuwaiq escarpment roughly 100 km from Riyadh, known for expansive desert panoramas and sunset views.',
      categoryTags: ['nature', 'hiking', 'sunset', 'photography', 'day trip', 'desert'],
      category: 'Nature',
      coordinates: { lat: 24.8327, lng: 45.5164 },
      photos: ['https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80'],
      image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      avgCost: 0,
      duration: 240,
    });
    console.log('✅ Place created:', place.name);
  } else {
    console.log('ℹ️  Place already exists:', place.name);
  }

  // 2. Get any existing user to assign as owner
  const user = await User.findOne();
  if (!user) {
    console.error('❌ No users found. Please register an account first, then re-run this script.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // 3. Create itinerary if it doesn't exist
  const existing = await Itinerary.findOne({ title: 'Edge of the World Day Trip' });
  if (existing) {
    console.log('ℹ️  Itinerary already exists. Skipping.');
    await mongoose.disconnect();
    return;
  }

  await Itinerary.create({
    userId: user._id,
    title: 'Edge of the World Day Trip',
    city: 'Riyadh',
    estimatedDuration: 480,
    estimatedCost: 150,
    distance: 210,
    notes: 'Depart early morning from Riyadh. A 4x4 vehicle is strongly recommended. Bring water, snacks, and sun protection. Best visited at sunrise or sunset for dramatic lighting.',
    places: [
      {
        placeId: place._id,
        order: 0,
        timeSlot: '06:00 AM',
        notes: 'Depart Riyadh early to reach the cliffs by sunrise. Follow the desert track — a guide or GPS is essential.',
      }
    ],
  });

  console.log('✅ Itinerary created: Edge of the World Day Trip');
  await mongoose.disconnect();
  console.log('✅ Done');
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
