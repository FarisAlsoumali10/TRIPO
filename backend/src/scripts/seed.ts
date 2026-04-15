/**
 * backend/src/scripts/seed.ts
 * Run: npx ts-node src/scripts/seed.ts
 *
 * Populates Tours, Rentals, Events, Places and Communities
 * with rich Saudi-themed mock data.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { Tour } from '../models/Tour';
import { Rental } from '../models/Rental';
import { Event } from '../models/Event';
import { Place } from '../models/Place';
import { Community } from '../models/Community';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tripo';

// ─── TOURS ────────────────────────────────────────────────────────────────────

const SEED_TOURS = [
  {
    title: 'Edge of the World Sunrise Hike',
    description: 'Stand at the top of the ancient Tuwaiq escarpment and watch the sun rise over an endless desert horizon.',
    highlights: ['Sunrise from 300-metre limestone cliffs', 'Expert guide navigating 4x4 desert tracks', 'Breakfast picnic at the cliff edge', 'Geological history talk'],
    heroImage: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
    ],
    pricePerPerson: 399,
    currency: 'SAR',
    maxGroupSize: 12,
    minGroupSize: 2,
    stops: [
      { order: 1, placeName: 'Riyadh Assembly Point', duration: 15, description: 'Meet your guide and group.', timeSlot: '4:30 AM' },
      { order: 2, placeName: 'Desert Track Drive', duration: 90, description: 'Thrilling off-road drive.', timeSlot: '4:45 AM' },
      { order: 3, placeName: 'Cliff Viewpoint & Breakfast', duration: 90, description: 'Breakfast picnic at the best vantage point.', timeSlot: '6:15 AM' },
    ],
    departureLocation: 'Riyadh — KAFD Parking',
    departureTime: '4:30 AM',
    returnTime: '10:00 AM',
    totalDuration: 5.5,
    difficulty: 'moderate',
    included: ['4x4 transport', 'Expert guide', 'Sunrise breakfast', 'Arabic coffee & dates'],
    excluded: ['Travel insurance', 'Hiking boots'],
    guideName: 'Abdullah Al-Rashid',
    guideRating: 4.9,
    category: 'Nature',
    tags: ['hiking', 'sunrise', 'desert', '4x4'],
    rating: 4.9,
    reviewCount: 142,
    bookingsCount: 320,
    status: 'active',
  },
  {
    title: 'Diriyah Heritage Walk',
    description: 'Journey through 300 years of Saudi history in the ancient mud-brick city of Diriyah.',
    highlights: ['Private access to At-Turaif', 'Expert historian guide', 'Traditional Saudi lunch', 'Live calligraphy workshop'],
    heroImage: 'https://images.unsplash.com/photo-1564769625392-651b89c75c0a?w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1564769625392-651b89c75c0a?w=1200&q=80'],
    pricePerPerson: 179,
    currency: 'SAR',
    maxGroupSize: 15,
    minGroupSize: 1,
    stops: [
      { order: 1, placeName: 'Diriyah Gate', duration: 20, description: 'Begin at the grand entrance.', timeSlot: '9:00 AM' },
      { order: 2, placeName: 'At-Turaif District', duration: 90, description: 'Explore the famous mud-brick palaces.', timeSlot: '9:20 AM' },
      { order: 3, placeName: 'Wadi Hanifah Terrace', duration: 60, description: 'Traditional Saudi lunch with a view.', timeSlot: '11:35 AM' },
    ],
    departureLocation: 'Diriyah Gate, Riyadh',
    departureTime: '9:00 AM',
    returnTime: '1:00 PM',
    totalDuration: 4,
    difficulty: 'easy',
    included: ['Heritage site entry', 'Historian guide', 'Traditional lunch'],
    excluded: ['Personal souvenirs', 'Tips'],
    guideName: 'Norah Al-Qahtani',
    guideRating: 4.8,
    category: 'Heritage',
    tags: ['history', 'culture', 'UNESCO'],
    rating: 4.8,
    reviewCount: 98,
    bookingsCount: 215,
    status: 'active',
  },
  {
    title: 'Desert Dunes Safari',
    description: 'Experience the raw power of the Arabian desert on this adrenaline-filled dune bashing and sandboarding adventure.',
    highlights: ['Thrilling 4x4 dune bashing', 'Sandboarding on 80-metre dunes', 'Camel ride at sunset', 'Bedouin camp dinner'],
    heroImage: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200&q=80'],
    pricePerPerson: 299,
    currency: 'SAR',
    maxGroupSize: 16,
    minGroupSize: 2,
    stops: [
      { order: 1, placeName: 'Al Thumamah Desert Park', duration: 20, description: 'Safety briefing and gear up.', timeSlot: '3:00 PM' },
      { order: 2, placeName: 'Red Dunes Zone', duration: 90, description: 'Heart-stopping dune bashing.', timeSlot: '3:20 PM' },
      { order: 3, placeName: 'Bedouin Camp', duration: 120, description: 'Camel ride, dinner, and stargazing.', timeSlot: '5:50 PM' },
    ],
    departureLocation: 'Al Thumamah National Park Gate, North Riyadh',
    departureTime: '3:00 PM',
    returnTime: '9:00 PM',
    totalDuration: 6,
    difficulty: 'moderate',
    included: ['4x4 dune bashing', 'Sandboarding equipment', 'Camel ride', 'Bedouin dinner'],
    excluded: ['Travel insurance', 'Photography packages'],
    guideName: 'Faisal Al-Otaibi',
    guideRating: 4.9,
    category: 'Adventure',
    tags: ['dunes', 'safari', 'sandboarding', 'camel'],
    rating: 4.7,
    reviewCount: 76,
    bookingsCount: 178,
    status: 'active',
  },
  {
    title: 'Riyadh Street Food Night Tour',
    description: "Dive into Riyadh's vibrant street food scene after dark. Walk through traditional souqs and legendary local joints.",
    highlights: ['Taste 10+ authentic Saudi street foods', 'Hidden gems known only to locals', 'Night walk through Al Baatha district', 'Finish with kunafa at a legendary sweet shop'],
    heroImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80'],
    pricePerPerson: 149,
    currency: 'SAR',
    maxGroupSize: 10,
    minGroupSize: 1,
    stops: [
      { order: 1, placeName: 'Souq Al Zal Night Market', duration: 30, description: 'Start with murtabak & tamarind juice.', timeSlot: '7:00 PM' },
      { order: 2, placeName: 'Al Baatha District', duration: 45, description: 'Kabsa sandwiches and ful medames.', timeSlot: '7:30 PM' },
      { order: 3, placeName: 'Hatab Kunafa Corner', duration: 30, description: 'Crispy cheese kunafa.', timeSlot: '9:15 PM' },
    ],
    departureLocation: 'Souq Al Zal, Al Dirah, Riyadh',
    departureTime: '7:00 PM',
    returnTime: '10:00 PM',
    totalDuration: 3,
    difficulty: 'easy',
    included: ['All food tastings (10+ items)', 'Expert food guide', 'Bottled water'],
    excluded: ['Additional purchases'],
    guideName: 'Sara Al-Dossari',
    guideRating: 4.8,
    category: 'Food',
    tags: ['food', 'street food', 'night tour', 'local'],
    rating: 4.8,
    reviewCount: 63,
    bookingsCount: 131,
    status: 'active',
  },
  {
    title: 'AlUla Historical Explorer — 3 Days',
    description: 'A fully organised trip to AlUla including accommodation, transport, and guided tours of Hegra.',
    highlights: ['Al-Hijr (Madain Saleh)', 'Elephant Rock', 'AlUla Old Town', 'Luxury resort stay'],
    heroImage: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200&q=80',
    images: ['https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=1200&q=80'],
    pricePerPerson: 1850,
    currency: 'SAR',
    maxGroupSize: 12,
    minGroupSize: 2,
    stops: [
      { order: 1, placeName: 'AlUla Airport', duration: 30, description: 'Welcome & hotel check-in.' },
      { order: 2, placeName: 'Hegra (Madain Saleh)', duration: 240, description: 'Guided Nabataean archeological tour.' },
      { order: 3, placeName: 'Elephant Rock', duration: 60, description: 'Sunset photo stop.' },
    ],
    departureLocation: 'Riyadh — King Khalid International Airport',
    departureTime: '6:00 AM',
    returnTime: '10:00 PM + 2 days',
    totalDuration: 72,
    difficulty: 'easy',
    included: ['Domestic flights', 'Hotel (3 nights)', 'All guided tours', 'Meals'],
    excluded: ['Visa', 'Personal expenses', 'Travel insurance'],
    guideName: 'AlUla Tours',
    guideRating: 4.9,
    category: 'Heritage',
    tags: ['alula', 'heritage', 'UNESCO', '3-day'],
    rating: 4.9,
    reviewCount: 54,
    bookingsCount: 96,
    status: 'active',
  },
];

// ─── RENTALS ──────────────────────────────────────────────────────────────────

const SEED_RENTALS = [
  {
    title: 'Desert Kashta Camp — Al Thumamah',
    type: 'Kashta',
    price: 850,
    currency: 'SAR',
    capacity: 20,
    locationName: 'Al Thumamah, Riyadh',
    city: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
      'https://images.unsplash.com/photo-1533745848184-3db07256e163?w=800&q=80',
    ],
    rating: 4.8,
    reviewCount: 142,
    description: 'A premium desert kashta camp set among rolling red dunes north of Riyadh.',
    amenities: ['BBQ', 'Kitchen', 'Parking', 'Fireplace', 'Restroom'],
    cleaningFee: 100,
    serviceFee: 80,
    lat: 24.898,
    lng: 46.712,
    mapQuery: 'Al Thumamah National Park, Riyadh',
    contactName: 'Mohammed Al-Shehri',
    contactPhone: '+966501234567',
    contactWhatsapp: '+966501234567',
    verified: true,
    available: true,
  },
  {
    title: 'Mountain Chalet — Abha Highlands',
    type: 'Chalet',
    price: 1200,
    currency: 'SAR',
    capacity: 8,
    locationName: 'Abha, Asir Region',
    city: 'Abha',
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80',
      'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&q=80',
    ],
    rating: 4.9,
    reviewCount: 89,
    bedrooms: 3,
    description: 'Stunning mountain chalet with panoramic views over the Asir mountains.',
    amenities: ['WiFi', 'Kitchen', 'BBQ', 'AC', 'Fireplace', 'Parking'],
    cleaningFee: 150,
    serviceFee: 120,
    lat: 18.2164,
    lng: 42.5053,
    mapQuery: 'Abha, Asir, Saudi Arabia',
    contactName: 'Fatima Al-Ghamdi',
    contactPhone: '+966509876543',
    contactWhatsapp: '+966509876543',
    verified: true,
    available: true,
  },
  {
    title: 'Red Sea Beachfront Camp — Yanbu',
    type: 'Camp',
    price: 650,
    currency: 'SAR',
    capacity: 12,
    locationName: 'Yanbu Al-Bahr, Madinah',
    city: 'Yanbu',
    image: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&q=80'],
    rating: 4.7,
    reviewCount: 56,
    description: 'Wake up steps from the crystal-clear Red Sea. Direct access to world-class snorkelling reefs.',
    amenities: ['BBQ', 'Snorkeling', 'Kayak', 'Shower Facilities', 'Beach Access'],
    cleaningFee: 80,
    serviceFee: 65,
    lat: 24.0889,
    lng: 38.0580,
    mapQuery: 'Yanbu Al-Bahr Beach, Saudi Arabia',
    contactName: 'Khalid Al-Zahrani',
    contactPhone: '+966554321098',
    contactWhatsapp: '+966554321098',
    available: true,
  },
  {
    title: 'AlUla Desert Glamping',
    type: 'Camp',
    price: 1500,
    currency: 'SAR',
    capacity: 4,
    locationName: 'AlUla, Madinah Region',
    city: 'AlUla',
    image: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800&q=80',
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
    ],
    rating: 5.0,
    reviewCount: 204,
    bedrooms: 2,
    description: 'Sleep under the stars in unparalleled luxury amid the dramatic sandstone mountains of AlUla.',
    amenities: ['Pool', 'WiFi', 'Kitchen', 'AC', 'Parking', 'Room Service'],
    cleaningFee: 200,
    serviceFee: 150,
    lat: 26.6144,
    lng: 37.9146,
    mapQuery: 'AlUla Old Town, Saudi Arabia',
    contactName: 'Reem Al-Harbi',
    contactPhone: '+966561234567',
    contactWhatsapp: '+966561234567',
    verified: true,
    available: true,
  },
  {
    title: 'Jeddah Corniche Chalet',
    type: 'Chalet',
    price: 2500,
    currency: 'SAR',
    capacity: 10,
    locationName: 'North Obhur, Jeddah',
    city: 'Jeddah',
    image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80'],
    rating: 4.6,
    reviewCount: 112,
    bedrooms: 4,
    description: 'Stunning chalet with private pool and sea view. Perfect for family gatherings.',
    amenities: ['Pool', 'WiFi', 'Kitchen', 'AC', 'Parking', 'Sea View', 'BBQ'],
    cleaningFee: 300,
    serviceFee: 200,
    lat: 21.7816,
    lng: 39.1125,
    mapQuery: 'North Obhur, Jeddah',
    contactName: 'Ahmad Al-Malki',
    contactPhone: '+966556789012',
    contactWhatsapp: '+966556789012',
    verified: true,
    available: true,
  },
];

// ─── EVENTS ───────────────────────────────────────────────────────────────────

const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

const SEED_EVENTS = [
  {
    title: 'LEAP Tech Conference 2026',
    description: "One of the world's largest tech conferences showcasing AI, robotics, and innovation.",
    date: days(30),
    endDate: days(33),
    time: '9:00 AM',
    locationName: 'Riyadh Front Exhibition Centre',
    city: 'Riyadh',
    category: 'Business & Tech',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    color: '#6366f1',
    isFree: false,
    fee: 1500,
    currency: 'SAR',
    website: 'https://leap.gov.sa',
    hours: '9:00 AM – 7:00 PM daily',
    mapQuery: 'Riyadh+Front+Exhibition+Centre+Riyadh',
  },
  {
    title: 'Riyadh Season Boulevard World',
    description: 'Experience cultures from around the world in one place — rides, food, and live shows every night.',
    date: days(5),
    endDate: days(90),
    time: '4:00 PM',
    locationName: 'Boulevard World, Riyadh',
    city: 'Riyadh',
    category: 'Entertainment',
    image: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=80',
    color: '#d97706',
    isFree: false,
    fee: 150,
    currency: 'SAR',
    hours: '4:00 PM – 1:00 AM',
    mapQuery: 'Boulevard+World+Riyadh',
  },
  {
    title: 'Founding Day Celebrations',
    description: 'Commemorating the founding of the First Saudi State with nationwide cultural events and fireworks.',
    date: new Date('2027-02-22'),
    endDate: new Date('2027-02-22'),
    time: '10:00 AM',
    locationName: 'Nationwide',
    city: 'All cities',
    category: 'National',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
    color: '#10b981',
    isFree: true,
    fee: 0,
    hours: 'Events throughout the day; main fireworks at 9:00 PM',
    mapQuery: 'Diriyah+Heritage+Site+Riyadh',
  },
  {
    title: 'Red Sea International Film Festival',
    description: 'Celebrating Arab and international cinema with screenings, masterclasses, and red carpet premieres.',
    date: new Date('2026-11-07'),
    endDate: new Date('2026-11-16'),
    time: '10:00 AM',
    locationName: 'Various venues, Jeddah',
    city: 'Jeddah',
    category: 'Culture',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
    color: '#ec4899',
    isFree: false,
    fee: 50,
    currency: 'SAR',
    website: 'https://rsiff.com',
    hours: 'Screenings from 10:00 AM; evening galas from 7:00 PM',
    mapQuery: 'Red+Sea+Film+Festival+Jeddah',
  },
  {
    title: 'Saudi Cup Horse Racing',
    description: "The world's richest horse race with a $20 million prize.",
    date: new Date('2027-02-28'),
    endDate: new Date('2027-02-28'),
    time: '12:00 PM',
    locationName: 'King Abdulaziz Racecourse',
    city: 'Riyadh',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=800&q=80',
    color: '#d97706',
    isFree: false,
    fee: 0,
    hours: 'Gates open 12:00 PM; main race around 7:00 PM',
    website: 'https://saudicup.com',
    mapQuery: 'King+Abdulaziz+Racecourse+Riyadh',
  },
  // ✅ FIX: this object was never closed in the original — closing brace and
  //         comma added here, and the array is properly closed below
  {
    title: 'AlUla Moments Winter Festival',
    description: 'Desert festivals, stargazing, and ancient Nabataean heritage tours in the dramatic landscape of AlUla.',
    date: new Date('2027-01-15'),
    endDate: new Date('2027-03-15'),
    time: '10:00 AM',
    locationName: 'AlUla',
    city: 'AlUla',
    category: 'Culture',
    image: 'https://images.unsplash.com/photo-1631217073612-e1f270b45958?w=800&q=80',
    color: '#0d9488',
    isFree: false,
    fee: 200,
    currency: 'SAR',
    hours: '10:00 AM – 10:00 PM',
    mapQuery: 'AlUla+Winter+Festival+Saudi+Arabia',
  },
  // ← ✅ array properly closed here
];

// ─── PLACES ───────────────────────────────────────────────────────────────────

const SEED_PLACES = [
  { name: 'Edge of the World', city: 'Riyadh', description: 'Dramatic limestone cliffs on the edge of the Tuwaiq Escarpment.', categoryTags: ['Nature', 'Adventure'], coordinates: { lat: 24.0481, lng: 46.7161 }, photos: ['https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800'], category: 'Nature', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800', avgCost: 50, duration: 180, accessType: 'free', isFamilySuitable: true, isTrending: true, status: 'active', ratingSummary: { avgRating: 4.8, reviewCount: 412 } },
  { name: 'Diriyah At-Turaif', city: 'Riyadh', description: 'UNESCO World Heritage Site — ancient mud-brick capital of the first Saudi state.', categoryTags: ['Heritage', 'Urban'], coordinates: { lat: 24.7349, lng: 46.5702 }, photos: ['https://images.unsplash.com/photo-1586944424476-5a2e2c5b7b03?w=800'], category: 'Heritage', image: 'https://images.unsplash.com/photo-1586944424476-5a2e2c5b7b03?w=800', avgCost: 45, duration: 120, accessType: 'ticketed', isFamilySuitable: true, isTrending: true, status: 'active', ratingSummary: { avgRating: 4.7, reviewCount: 889 } },
  { name: 'Al Ula Old Town', city: 'Al Ula', description: "A labyrinth of mud-brick houses nestled in a palm grove.", categoryTags: ['Heritage', 'Nature'], coordinates: { lat: 26.6142, lng: 37.9182 }, photos: ['https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800'], category: 'Heritage', image: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=800', avgCost: 30, duration: 90, accessType: 'free', isFamilySuitable: true, isTrending: true, status: 'active', ratingSummary: { avgRating: 4.9, reviewCount: 634 } },
  { name: 'Hegra (Madain Saleh)', city: 'Al Ula', description: "Saudi Arabia's first UNESCO World Heritage Site — monumental Nabataean tombs.", categoryTags: ['Heritage', 'Adventure'], coordinates: { lat: 26.7941, lng: 37.9551 }, photos: ['https://images.unsplash.com/photo-1525168955875-4357e24b6882?w=800'], category: 'Heritage', image: 'https://images.unsplash.com/photo-1525168955875-4357e24b6882?w=800', avgCost: 95, duration: 240, accessType: 'ticketed', isFamilySuitable: false, isTrending: true, status: 'active', ratingSummary: { avgRating: 4.9, reviewCount: 501 } },
  { name: 'Jeddah Corniche', city: 'Jeddah', description: 'A 30km beachfront promenade with sculptures, fountains, and the iconic King Fahd Fountain.', categoryTags: ['Urban', 'Beach'], coordinates: { lat: 21.5433, lng: 39.1728 }, photos: ['https://images.unsplash.com/photo-1617634754278-32c2c1acbe69?w=800'], category: 'Urban', image: 'https://images.unsplash.com/photo-1617634754278-32c2c1acbe69?w=800', avgCost: 0, duration: 60, accessType: 'free', isFamilySuitable: true, isTrending: false, status: 'active', ratingSummary: { avgRating: 4.5, reviewCount: 1200 } },
  { name: 'Asir National Park', city: 'Abha', description: 'Lush green mountains, misty valleys and vervet monkeys — the greenest corner of Saudi Arabia.', categoryTags: ['Nature', 'Adventure'], coordinates: { lat: 18.2394, lng: 42.5048 }, photos: ['https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800'], category: 'Nature', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800', avgCost: 25, duration: 180, accessType: 'ticketed', isFamilySuitable: true, isTrending: true, status: 'active', ratingSummary: { avgRating: 4.7, reviewCount: 765 } },
  { name: 'Riyadh Boulevard City', city: 'Riyadh', description: 'A massive entertainment destination with restaurants, rides, and shows.', categoryTags: ['Urban', 'Food'], coordinates: { lat: 24.7747, lng: 46.8355 }, photos: ['https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800'], category: 'Urban', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=800', avgCost: 80, duration: 180, accessType: 'free', isFamilySuitable: true, isTrending: true, status: 'active', ratingSummary: { avgRating: 4.4, reviewCount: 2310 } },
  { name: 'Empty Quarter Dunes', city: 'Sharurah', description: 'The largest continuous sand desert on Earth — perfect for stargazing and dune driving.', categoryTags: ['Desert', 'Adventure'], coordinates: { lat: 18.9737, lng: 46.6248 }, photos: ['https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800'], category: 'Desert', image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800', avgCost: 200, duration: 480, accessType: 'free', isFamilySuitable: false, isTrending: false, status: 'active', ratingSummary: { avgRating: 4.8, reviewCount: 234 } },
];

// ─── COMMUNITIES ──────────────────────────────────────────────────────────────

const SEED_COMMUNITIES = [
  { name: 'Riyadh Explorers', icon: '🏙️', memberCount: 3420, description: 'Discovering hidden gems in the capital — from ancient forts to modern art.' },
  { name: 'Hiking Saudi', icon: '🥾', memberCount: 8750, description: "Saudi Arabia's largest community of hikers, trail runners and outdoor enthusiasts." },
  { name: 'Desert Drivers', icon: '🏜️', memberCount: 5120, description: 'Off-road adventures, dune bashing tips, and 4x4 convoy planning across KSA.' },
  { name: 'Food Hunters KSA', icon: '🍽️', memberCount: 12300, description: 'Saudi food culture, restaurant reviews, and culinary travel across the Kingdom.' },
  { name: 'Al Ula & Hegra Fans', icon: '🏺', memberCount: 4890, description: 'Everything about the magical Hegra region — tips, photos, and guided tour reviews.' },
  { name: 'Jeddah Divers', icon: '🤿', memberCount: 2100, description: 'Red Sea diving spots, coral reefs, and underwater photography around Jeddah.' },
];

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

const seedDatabase = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to:', MONGODB_URI.split('@').pop());

    console.log('🧹 Wiping old test data...');
    await Promise.all([
      Tour.deleteMany({}),
      Rental.deleteMany({}),
      Event.deleteMany({}),
      Place.deleteMany({}),
      Community.deleteMany({}),
    ]);

    console.log('🧭 Inserting Tours...');
    const toursWithSlugs = SEED_TOURS.map((t, i) => ({
      ...t,
      slug:
        t.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 60) +
        '-' + Date.now() + '-' + i,
    }));
    const tours = await Tour.insertMany(toursWithSlugs, { ordered: false });
    console.log(`   ✔ ${tours.length} tours inserted`);

    console.log('🏕️  Inserting Rentals...');
    const rentals = await Rental.insertMany(SEED_RENTALS, { ordered: false });
    console.log(`   ✔ ${rentals.length} rentals inserted`);

    console.log('🎆 Inserting Events...');
    const events = await Event.insertMany(SEED_EVENTS, { ordered: false });
    console.log(`   ✔ ${events.length} events inserted`);

    console.log('📍 Inserting Places...');
    const places = await Place.insertMany(SEED_PLACES, { ordered: false });
    console.log(`   ✔ ${places.length} places inserted`);

    console.log('👥 Inserting Communities...');
    const communities = await Community.insertMany(SEED_COMMUNITIES, { ordered: false });
    console.log(`   ✔ ${communities.length} communities inserted`);

    console.log('\n🎉 Seeding complete! Your database is now populated with rich Saudi data.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDatabase();