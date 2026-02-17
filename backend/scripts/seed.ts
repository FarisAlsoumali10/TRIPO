import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import {
  User,
  Place,
  Itinerary,
  Review,
  GroupTrip,
  Expense,
  Message
} from '../src/models';
import { hashPassword } from '../src/utils/password';

const RIYADH_PLACES = [
  {
    name: 'Al Masmak Fortress',
    city: 'Riyadh',
    description: 'Historic clay and mud-brick fort built around 1865',
    categoryTags: ['history', 'museum', 'culture'],
    coordinates: { lat: 24.6308, lng: 46.7143 },
    photos: ['https://example.com/masmak.jpg']
  },
  {
    name: 'Kingdom Centre',
    city: 'Riyadh',
    description: '99-story skyscraper with shopping mall and Sky Bridge',
    categoryTags: ['shopping', 'viewpoint', 'modern'],
    coordinates: { lat: 24.7119, lng: 46.6742 },
    photos: ['https://example.com/kingdom.jpg']
  },
  {
    name: 'Diriyah',
    city: 'Riyadh',
    description: 'UNESCO World Heritage Site and birthplace of the Saudi state',
    categoryTags: ['history', 'culture', 'unesco'],
    coordinates: { lat: 24.7342, lng: 46.5747 },
    photos: ['https://example.com/diriyah.jpg']
  },
  {
    name: 'Al Nakheel Mall',
    city: 'Riyadh',
    description: 'Popular shopping destination with diverse dining options',
    categoryTags: ['shopping', 'food', 'entertainment'],
    coordinates: { lat: 24.7706, lng: 46.7394 },
    photos: ['https://example.com/nakheel.jpg']
  },
  {
    name: 'King Abdullah Park',
    city: 'Riyadh',
    description: 'Beautiful public park with fountains and walking paths',
    categoryTags: ['park', 'nature', 'family'],
    coordinates: { lat: 24.8069, lng: 46.6372 },
    photos: ['https://example.com/abdullah-park.jpg']
  },
  {
    name: 'Najd Village Restaurant',
    city: 'Riyadh',
    description: 'Traditional Saudi cuisine in authentic heritage setting',
    categoryTags: ['food', 'traditional', 'restaurant'],
    coordinates: { lat: 24.7138, lng: 46.6795 },
    photos: ['https://example.com/najd-village.jpg']
  },
  {
    name: 'Riyadh Zoo',
    city: 'Riyadh',
    description: 'Large zoo with diverse animal species and family activities',
    categoryTags: ['zoo', 'family', 'nature'],
    coordinates: { lat: 24.6941, lng: 46.6024 },
    photos: ['https://example.com/zoo.jpg']
  },
  {
    name: 'National Museum',
    city: 'Riyadh',
    description: 'Comprehensive museum showcasing Saudi Arabia\'s history',
    categoryTags: ['museum', 'culture', 'history'],
    coordinates: { lat: 24.6482, lng: 46.7095 },
    photos: ['https://example.com/national-museum.jpg']
  },
  {
    name: 'Wadi Hanifah',
    city: 'Riyadh',
    description: 'Scenic valley with walking trails and natural beauty',
    categoryTags: ['nature', 'hiking', 'outdoor'],
    coordinates: { lat: 24.6092, lng: 46.6195 },
    photos: ['https://example.com/wadi-hanifah.jpg']
  },
  {
    name: 'Granada Center',
    city: 'Riyadh',
    description: 'Shopping mall with international brands and restaurants',
    categoryTags: ['shopping', 'food', 'entertainment'],
    coordinates: { lat: 24.7358, lng: 46.6819 },
    photos: ['https://example.com/granada.jpg']
  }
];

async function seed() {
  try {
    await connectDatabase();
    console.log('🌱 Starting seed...\n');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Place.deleteMany({}),
      Itinerary.deleteMany({}),
      Review.deleteMany({}),
      GroupTrip.deleteMany({}),
      Expense.deleteMany({}),
      Message.deleteMany({})
    ]);

    // Create users
    console.log('Creating users...');
    const password = await hashPassword('password123');

    const admin = await User.create({
      email: 'admin@tripo.sa',
      passwordHash: password,
      name: 'Admin User',
      role: 'admin',
      language: 'en',
      smartProfile: {
        interests: ['culture', 'history'],
        preferredBudget: 'medium',
        activityStyles: ['explorer', 'cultural'],
        typicalFreeTimeWindow: 240,
        city: 'Riyadh'
      }
    });

    const user1 = await User.create({
      email: 'user1@test.sa',
      passwordHash: password,
      name: 'Sara Ahmed',
      language: 'en',
      smartProfile: {
        interests: ['food', 'culture', 'shopping'],
        preferredBudget: 'medium',
        activityStyles: ['social', 'relaxed'],
        typicalFreeTimeWindow: 180,
        mood: 'curious',
        city: 'Riyadh'
      }
    });

    const user2 = await User.create({
      email: 'user2@test.sa',
      passwordHash: password,
      name: 'Mohammed Ali',
      language: 'ar',
      smartProfile: {
        interests: ['nature', 'adventure', 'history'],
        preferredBudget: 'high',
        activityStyles: ['active', 'explorer'],
        typicalFreeTimeWindow: 240,
        mood: 'adventurous',
        city: 'Riyadh'
      }
    });

    const host = await User.create({
      email: 'host@tripo.sa',
      passwordHash: password,
      name: 'Host Account',
      role: 'host',
      language: 'en',
      smartProfile: {
        interests: ['culture'],
        preferredBudget: 'medium',
        activityStyles: ['social'],
        typicalFreeTimeWindow: 180,
        city: 'Riyadh'
      }
    });

    console.log(`✅ Created ${4} users`);

    // Create places
    console.log('Creating places...');
    const places = await Place.insertMany(RIYADH_PLACES);
    console.log(`✅ Created ${places.length} places`);

    // Create itineraries
    console.log('Creating itineraries...');
    const itinerary1 = await Itinerary.create({
      userId: user1._id,
      title: 'Cultural Morning in Riyadh',
      status: 'published',
      estimatedDuration: 120,
      estimatedCost: 50,
      distance: 15,
      city: 'Riyadh',
      places: [
        { placeId: places[0]._id, order: 1, timeSlot: '9:00-10:00' },
        { placeId: places[7]._id, order: 2, timeSlot: '10:30-11:30' }
      ],
      notes: 'Perfect for history enthusiasts',
      isVerified: true
    });

    const itinerary2 = await Itinerary.create({
      userId: user2._id,
      title: 'Foodie Adventure',
      status: 'published',
      estimatedDuration: 180,
      estimatedCost: 150,
      distance: 20,
      city: 'Riyadh',
      places: [
        { placeId: places[5]._id, order: 1, timeSlot: '12:00-14:00' },
        { placeId: places[3]._id, order: 2, timeSlot: '15:00-17:00' }
      ],
      notes: 'Try traditional Saudi dishes followed by modern cuisine'
    });

    const itinerary3 = await Itinerary.create({
      userId: admin._id,
      title: 'Family Fun Day',
      status: 'published',
      estimatedDuration: 240,
      estimatedCost: 100,
      distance: 25,
      city: 'Riyadh',
      places: [
        { placeId: places[4]._id, order: 1, timeSlot: '10:00-12:00' },
        { placeId: places[6]._id, order: 2, timeSlot: '14:00-17:00' }
      ],
      isVerified: true
    });

    console.log(`✅ Created ${3} itineraries`);

    // Create reviews
    console.log('Creating reviews...');
    await Review.insertMany([
      {
        userId: user1._id,
        targetType: 'itinerary',
        targetId: itinerary1._id,
        rating: 5,
        title: 'Amazing experience!',
        comment: 'Loved every moment of this tour'
      },
      {
        userId: user2._id,
        targetType: 'itinerary',
        targetId: itinerary1._id,
        rating: 4,
        comment: 'Great itinerary, well organized'
      },
      {
        userId: user1._id,
        targetType: 'place',
        targetId: places[0]._id,
        rating: 5,
        title: 'Must visit!',
        comment: 'Beautiful historic site'
      }
    ]);

    // Update rating summaries
    itinerary1.ratingSummary = { avgRating: 4.5, reviewCount: 2 };
    await itinerary1.save();

    places[0].ratingSummary = { avgRating: 5, reviewCount: 1 };
    await places[0].save();

    console.log(`✅ Created ${3} reviews`);

    // Create group trip
    console.log('Creating group trip...');
    const groupTrip = await GroupTrip.create({
      organizerId: user1._id,
      baseItineraryId: itinerary1._id,
      title: 'Weekend Cultural Tour',
      memberIds: [user1._id, user2._id],
      status: 'active'
    });

    // Create expenses
    await Expense.insertMany([
      {
        groupTripId: groupTrip._id,
        payerId: user1._id,
        amount: 30,
        description: 'Museum tickets',
        involvedMemberIds: [user1._id, user2._id]
      },
      {
        groupTripId: groupTrip._id,
        payerId: user2._id,
        amount: 50,
        description: 'Lunch',
        involvedMemberIds: [user1._id, user2._id]
      }
    ]);

    // Create messages
    await Message.insertMany([
      {
        groupTripId: groupTrip._id,
        senderId: user1._id,
        content: 'Excited for tomorrow!',
        type: 'text'
      },
      {
        groupTripId: groupTrip._id,
        senderId: user2._id,
        content: 'Me too! What time should we meet?',
        type: 'text'
      }
    ]);

    console.log(`✅ Created group trip with expenses and messages`);

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('📧 Demo accounts:');
    console.log('   Admin: admin@tripo.sa / password123');
    console.log('   User 1: user1@test.sa / password123');
    console.log('   User 2: user2@test.sa / password123');
    console.log('   Host: host@tripo.sa / password123\n');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await disconnectDatabase();
    process.exit(1);
  }
}

seed();
