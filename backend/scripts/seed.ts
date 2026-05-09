import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import path from 'path';

import { User, Place, Tour, Event, Community } from '../src/models';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tripo';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // ─── 1. Clear existing seed data ──────────────────────────────────────────
  await Promise.all([
    Place.deleteMany({}),
    Tour.deleteMany({}),
    Event.deleteMany({}),
    Community.deleteMany({ isOfficial: true }),
    User.deleteMany({ email: 'system@tripo.app' }),
  ]);
  console.log('🗑️  Cleared existing seed data');

  // ─── 2. System User ───────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Tripo@System2026!', 12);
  const systemUser = await User.create({
    name: 'Tripo Official',
    email: 'system@tripo.app',
    passwordHash: hashedPassword,
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=200',
    smartProfile: { city: 'Riyadh', interests: ['travel'], preferredBudget: 'high', activityStyles: ['cultural'], typicalFreeTimeWindow: 1440 },
    isEmailVerified: true,
  });
  console.log('👤 System user created:', systemUser._id);

  // ─── 3. Official Community ────────────────────────────────────────────────
  const community = await Community.create({
    name: 'Tripo Saudi Explorers',
    nameAr: 'مستكشفو السعودية - تريبو',
    description: 'The official Tripo community for Saudi Arabia travel lovers.',
    descriptionAr: 'مجتمع تريبو الرسمي لعشاق السفر في المملكة العربية السعودية.',
    image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=800',
    creator: systemUser._id,
    members: [systemUser._id],
    isOfficial: true,
    city: 'Riyadh',
  });
  console.log('🏛️  Official community created:', community._id);

  // ─── 4. Real Places ───────────────────────────────────────────────────────
  const places = await Place.insertMany([
    {
      name: 'Hegra (Madain Saleh)',
      nameAr: 'الحِجْر (مدائن صالح)',
      description: 'A UNESCO World Heritage Site featuring over 100 Nabataean tombs carved directly into sandstone outcrops. Saudi Arabia\'s first UNESCO site.',
      descriptionAr: 'موقع تراث عالمي لليونسكو يضم أكثر من 100 مقبرة نبطية منحوتة في الصخر مباشرةً. أول موقع سعودي مدرج على قائمة التراث العالمي.',
      city: 'AlUla',
      category: 'Heritage',
      categoryTags: ['Heritage', 'UNESCO', 'Archaeological'],
      coordinates: { lat: 26.7917, lng: 37.9522 },
      location: {
        type: 'Point',
        coordinates: [37.9522, 26.7917], // [lng, lat]
      },
      photos: [
        'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200',
        'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?w=800',
      ],
      image: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200',
      ratingSummary: { avgRating: 4.9, reviewCount: 1240 },
      isTrending: true,
      isFamilySuitable: true,
      openingHours: {
        sunday:    { open: '08:00', close: '18:00' },
        monday:    { open: '08:00', close: '18:00' },
        tuesday:   { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday:  { open: '08:00', close: '18:00' },
        friday:    { open: '14:00', close: '20:00' },
        saturday:  { open: '08:00', close: '18:00' },
      },
      createdBy: systemUser._id,
    },
    {
      name: 'Edge of the World (Jebel Fihrayn)',
      nameAr: 'حافة العالم (جبل فهرين)',
      description: 'A dramatic escarpment northwest of Riyadh offering a breathtaking view of an ancient seabed stretching to the horizon — one of Saudi Arabia\'s most iconic natural wonders.',
      descriptionAr: 'حافة جبلية درامية شمال غرب الرياض تطل على قاع بحر قديم يمتد حتى الأفق — واحدة من أبرز عجائب الطبيعة في المملكة.',
      city: 'Riyadh',
      category: 'Nature',
      categoryTags: ['Nature', 'Hiking', 'Photography'],
      coordinates: { lat: 24.9672, lng: 45.5162 },
      location: {
        type: 'Point',
        coordinates: [45.5162, 24.9672],
      },
      photos: [
        'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200',
      ],
      image: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200',
      ratingSummary: { avgRating: 4.8, reviewCount: 890 },
      isTrending: true,
      isFamilySuitable: false,
      createdBy: systemUser._id,
    },
    {
      name: 'Al-Balad Historic District',
      nameAr: 'حي البلد التاريخي',
      description: 'The old city of Jeddah and a UNESCO World Heritage Site, renowned for its distinctive coral architecture and ancient merchant houses with intricately carved wooden balconies (Rawasheen).',
      descriptionAr: 'المدينة القديمة لجدة ومدرجة على قائمة التراث العالمي، تشتهر بعمارة المرجان الفريدة والمنازل التجارية القديمة ذات الشرفات الخشبية المنحوتة (الروشان).',
      city: 'Jeddah',
      category: 'Heritage',
      categoryTags: ['Heritage', 'UNESCO', 'Architecture', 'Culture'],
      coordinates: { lat: 21.4858, lng: 39.1885 },
      location: {
        type: 'Point',
        coordinates: [39.1885, 21.4858],
      },
      photos: [
        'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200',
      ],
      image: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=1200',
      ratingSummary: { avgRating: 4.7, reviewCount: 2010 },
      isTrending: true,
      isFamilySuitable: true,
      openingHours: {
        sunday:    { open: '09:00', close: '22:00' },
        monday:    { open: '09:00', close: '22:00' },
        tuesday:   { open: '09:00', close: '22:00' },
        wednesday: { open: '09:00', close: '22:00' },
        thursday:  { open: '09:00', close: '23:00' },
        friday:    { open: '14:00', close: '23:00' },
        saturday:  { open: '09:00', close: '23:00' },
      },
      createdBy: systemUser._id,
    },
    {
      name: 'Asir National Park',
      nameAr: 'حديقة عسير الوطنية',
      description: 'A green mountain retreat in southwestern Saudi Arabia, featuring cool temperatures, diverse wildlife, terraced farms, and the iconic cable car over Abha. Perfect for families and nature lovers.',
      descriptionAr: 'منتجع جبلي أخضر في جنوب غرب المملكة، يتميز بطقس بارد وتنوع في الحياة البرية ومزارع مدرجة وتلفريك أبها الشهير. مثالي للعائلات ومحبي الطبيعة.',
      city: 'Abha',
      category: 'Nature',
      categoryTags: ['Nature', 'Family', 'Mountains', 'Cable Car'],
      coordinates: { lat: 18.2169, lng: 42.5050 },
      location: {
        type: 'Point',
        coordinates: [42.5050, 18.2169],
      },
      photos: [
        'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200',
      ],
      image: 'https://images.unsplash.com/photo-1602940659805-770d1b3b9911?w=1200',
      ratingSummary: { avgRating: 4.6, reviewCount: 1540 },
      isTrending: false,
      isFamilySuitable: true,
      createdBy: systemUser._id,
    },
    {
      name: 'Kingdom Centre Tower',
      nameAr: 'برج المملكة',
      description: 'The iconic skyscraper defining Riyadh\'s skyline, featuring a sky bridge at the top and the Four Seasons Hotel. A symbol of modern Saudi Arabia.',
      descriptionAr: 'ناطحة السحاب الأيقونية التي تحدد أفق الرياض، وتضم جسراً جوياً في القمة وفندق فور سيزونز. رمز المملكة العربية السعودية الحديثة.',
      city: 'Riyadh',
      category: 'Landmark',
      categoryTags: ['Landmark', 'Architecture', 'Shopping', 'Dining'],
      coordinates: { lat: 24.7114, lng: 46.6853 },
      location: {
        type: 'Point',
        coordinates: [46.6853, 24.7114],
      },
      photos: [
        'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200',
      ],
      image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=1200',
      ratingSummary: { avgRating: 4.5, reviewCount: 3200 },
      isTrending: true,
      isFamilySuitable: true,
      openingHours: {
        sunday:    { open: '10:00', close: '22:00' },
        monday:    { open: '10:00', close: '22:00' },
        tuesday:   { open: '10:00', close: '22:00' },
        wednesday: { open: '10:00', close: '22:00' },
        thursday:  { open: '10:00', close: '23:00' },
        friday:    { open: '14:00', close: '23:00' },
        saturday:  { open: '10:00', close: '23:00' },
      },
      createdBy: systemUser._id,
    },
  ]);
  console.log(`📍 ${places.length} places seeded`);

  // ─── 5. Real Events (2026 agenda) ─────────────────────────────────────────
  const events = await Event.insertMany([
    {
      title: 'Winter at Tantora Festival 2026',
      titleAr: 'مهرجان شتاء طنطورة 2026',
      description: 'AlUla\'s flagship winter festival celebrating heritage, music, and culture under the stars at Maraya Concert Hall and across AlUla\'s ancient landscapes.',
      descriptionAr: 'مهرجان العُلا الرئيسي للشتاء يحتفي بالتراث والموسيقى والثقافة تحت النجوم في قاعة مرايا وعبر مناظر العُلا الأثرية.',
      date: '2026-11-15',
      startDate: '2026-11-15',
      endDate: '2027-02-28',
      endTime: '2027-02-28',
      locationName: 'Maraya Concert Hall, AlUla',
      city: 'AlUla',
      image: 'https://images.unsplash.com/photo-1596008194705-f0ff3d2c95a2?w=800',
      isFree: false,
      price: 250,
      fee: 250,
      community: community._id,
      communityId: community._id.toString(),
      organizer: systemUser._id,
      createdBy: systemUser._id.toString(),
      category: 'Festival',
      recurrence: 'once',
      status: 'published',
    },
    {
      title: 'Riyadh Season 2026',
      titleAr: 'موسم الرياض 2026',
      description: 'The largest entertainment event in Saudi Arabia, transforming Riyadh into a global entertainment hub with concerts, exhibitions, sports events, and world-class performances.',
      descriptionAr: 'أكبر حدث ترفيهي في المملكة العربية السعودية، يحول الرياض إلى مركز ترفيهي عالمي بالحفلات والمعارض والفعاليات الرياضية والعروض العالمية.',
      date: '2026-10-01',
      startDate: '2026-10-01',
      endDate: '2027-01-31',
      endTime: '2027-01-31',
      locationName: 'Multiple Venues, Riyadh',
      city: 'Riyadh',
      image: 'https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=800',
      isFree: false,
      price: 0,
      fee: 0,
      community: community._id,
      communityId: community._id.toString(),
      organizer: systemUser._id,
      createdBy: systemUser._id.toString(),
      category: 'Entertainment',
      recurrence: 'once',
      status: 'published',
    },
  ]);
  console.log(`🗓️  ${events.length} events seeded`);

  // ─── 6. Real Tours ────────────────────────────────────────────────────────
  const tours = await Tour.insertMany([
    {
      title: 'Hegra & AlUla Heritage Full-Day Expedition',
      titleAr: 'رحلة الحِجر والعُلا التراثية - يوم كامل',
      description: 'A fully-guided expedition to Saudi Arabia\'s most spectacular UNESCO site. Walk among the ancient Nabataean tombs of Hegra, explore AlUla Old Town, and witness the iconic Elephant Rock at sunset.',
      descriptionAr: 'رحلة مُرشَدة بالكامل إلى أبرز مواقع اليونسكو في المملكة. تجول بين مقابر الأنباط في الحِجر، واستكشف بلدة العُلا القديمة، وشاهد صخرة الفيل الأيقونية عند الغروب.',
      heroImage: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200',
      images: [
        'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=800',
        'https://images.unsplash.com/photo-1618923850107-d1a234d7a73a?w=800',
      ],
      departureLocation: 'AlUla Airport / City Hotel',
      category: 'Heritage',
      difficulty: 'easy',
      totalDuration: 8,
      pricePerPerson: 650,
      currency: 'SAR',
      maxGroupSize: 12,
      rating: 4.9,
      reviewCount: 124,
      language: ['Arabic', 'English'],
      included: ['Licensed guide', 'Entry tickets', 'Lunch', 'Transportation', 'Water'],
      ownerId: systemUser._id,
      status: 'active',
    },
  ]);
  console.log(`🧭 ${tours.length} tours seeded`);

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n🌟 Seeding complete!');
  console.log('─────────────────────────────────────');
  console.log(`  👤 System User  : ${systemUser.email}`);
  console.log(`  🏛️  Community    : ${community.name}`);
  console.log(`  📍 Places       : ${places.length}`);
  console.log(`  🗓️  Events       : ${events.length}`);
  console.log(`  🧭 Tours        : ${tours.length}`);
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
