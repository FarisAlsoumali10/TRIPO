/**
 * backend/src/scripts/seed.ts
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/seed.ts
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

// ─── IMAGES ──────────────────────────────────────────────────────────────────
// ثابتة وآمنة للنسخ والتشغيل
const P = (seed: number, w = 1200, h = 800) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const IMGS = {
  diriyah:      '/api/photos?place=Diriyah+Heritage+District+Riyadh',
  diriyah2:     '/api/photos?place=Al+Bujairi+Heritage+Park+Riyadh',
  mud_wall:     '/api/photos?place=At-Turaif+Mud+Palace+Diriyah',
  riyadh_sky:   '/api/photos?place=Kingdom+Centre+Tower+Riyadh',
  riyadh_sky2:  '/api/photos?place=Al+Faisaliyah+Center+Riyadh',
  riyadh_night: '/api/photos?place=Riyadh+City+Skyline+Night',
  desert_red:   '/api/photos?place=Red+Sand+Dunes+Riyadh',
  desert_dunes: '/api/photos?place=AlUla+Elephant+Rock+Saudi',
  desert_night: '/api/photos?place=Saudi+Desert+Camp+Night',
  desert_hike:  '/api/photos?place=Edge+of+the+World+Riyadh',
  desert_camp:  '/api/photos?place=Luxury+Desert+Camp+Saudi',
  wadi:         '/api/photos?place=Wadi+Hanifa+Wetlands+Riyadh',
  arabic_food:  '/api/photos?place=Saudi+Kabsa+Traditional+Food',
  souq:         '/api/photos?place=Souq+Al+Zal+Riyadh',
  coffee_arabic:'/api/photos?place=Traditional+Arabic+Coffee+Dallah',
  festival:     '/api/photos?place=Riyadh+Season+Boulevard',
  racing:       '/api/photos?place=Jeddah+Corniche+Circuit',
  gaming_event: '/api/photos?place=Riyadh+Front+Exhibition',
  pool_chalet:  '/api/photos?place=Luxury+Resort+Pool+Saudi',
  luxury_tent:  '/api/photos?place=Glamping+Tent+AlUla',
  farm_palm:    '/api/photos?place=Al+Ahsa+Oasis+Palm+Trees',
  kingdom_tower:'/api/photos?place=Kingdom+Centre+Skybridge',
  nofa:         '/api/photos?place=Nofa+Safari+Resort+Riyadh',
  riyadh_front: '/api/photos?place=Riyadh+Front+Shopping',
  bujairi:      '/api/photos?place=Bujairi+Terrace+Diriyah',
  najd_village: '/api/photos?place=Najd+Village+Restaurant+Riyadh',
};

// ─── TOURS ───────────────────────────────────────────────────────────────────

const SEED_TOURS = [
  {
    title: 'Diriyah Heritage Walk — At-Turaif District',
    description:
      'Walk through the UNESCO-listed At-Turaif mud-brick palaces of the first Saudi capital. An immersive journey into 300 years of Saudi history through the iconic Salwa Palace and ancient Najdi alleys.',
    highlights: [
      'Guided tour of Salwa Palace & Turaif Quarter',
      'Traditional Najdi mud-brick architecture',
      'Sunset at Wadi Hanifa overlook',
      'Authentic Saudi coffee & dates ceremony',
    ],
    heroImage: IMGS.diriyah,
    images: [IMGS.diriyah, IMGS.mud_wall, IMGS.diriyah2],
    pricePerPerson: 150,
    currency: 'SAR',
    maxGroupSize: 15,
    minGroupSize: 2,
    stops: [
      { order: 1, placeName: 'Diriyah Gate Visitor Center', duration: 20, description: 'Ticket pickup & intro film.', timeSlot: '4:00 PM' },
      { order: 2, placeName: 'At-Turaif District', duration: 120, description: 'Guided tour of mud-brick palaces.', timeSlot: '4:30 PM' },
      { order: 3, placeName: 'Wadi Hanifa Terrace', duration: 45, description: 'Sunset views & Saudi coffee.', timeSlot: '6:30 PM' },
    ],
    departureLocation: 'Diriyah Gate Visitor Center, Riyadh',
    departureTime: '4:00 PM',
    returnTime: '8:00 PM',
    totalDuration: 4,
    difficulty: 'easy',
    included: ['Licensed guide', 'Entry tickets', 'Saudi coffee & dates', 'Shuttle within site'],
    excluded: ['Hotel pickup', 'Personal souvenirs'],
    guideName: 'Diriyah Authority Tours',
    guideRating: 4.9,
    category: 'Heritage',
    tags: ['diriyah', 'UNESCO', 'heritage', 'history', 'family', 'riyadh'],
    rating: 4.9,
    reviewCount: 540,
    bookingsCount: 1200,
    status: 'active',
  },
  {
    title: 'Al Thumamah Off-road & Nature Hike',
    description:
      'Escape Riyadh in 30 minutes. A half-day adventure combining 4x4 dune driving through Al Thumamah red sand dunes with a guided nature trail through the protected park.',
    highlights: [
      '4x4 convoy through red dunes',
      'Guided trail in Al Thumamah National Park',
      'Birdwatching at the nature reserve',
      'Campfire breakfast in the open desert',
    ],
    heroImage: IMGS.desert_hike,
    images: [IMGS.desert_hike, IMGS.desert_red, IMGS.desert_night],
    pricePerPerson: 280,
    currency: 'SAR',
    maxGroupSize: 12,
    minGroupSize: 4,
    stops: [
      { order: 1, placeName: 'Al Thumamah Park North Gate', duration: 15, description: 'Meet the guide & gear check.', timeSlot: '6:00 AM' },
      { order: 2, placeName: 'Red Dune Belt', duration: 90, description: '4x4 dune driving session.', timeSlot: '6:30 AM' },
      { order: 3, placeName: 'Nature Trail Head', duration: 150, description: 'Guided hike.', timeSlot: '8:30 AM' },
      { order: 4, placeName: 'Campfire Breakfast Spot', duration: 60, description: 'Breakfast in the desert.', timeSlot: '11:00 AM' },
    ],
    departureLocation: 'Al Thumamah Park North Gate, Riyadh',
    departureTime: '6:00 AM',
    returnTime: '1:00 PM',
    totalDuration: 7,
    difficulty: 'moderate',
    included: ['4x4 transport', 'Guide', 'Campfire breakfast', 'Water & snacks'],
    excluded: ['Hiking boots', 'Personal medical kit'],
    guideName: 'Husaak Adventures – Riyadh',
    guideRating: 4.8,
    category: 'Adventure',
    tags: ['hiking', 'offroad', '4x4', 'nature', 'riyadh', 'thumamah'],
    rating: 4.8,
    reviewCount: 312,
    bookingsCount: 680,
    status: 'active',
  },
  {
    title: 'Riyadh Flavours — Street Food & Souq Walk',
    description:
      'Discover the real Riyadh through its food. From Mutabbaq in Al Batha to Bukhari rice in Sulaimaniyah — a culinary crawl through the city’s most iconic neighbourhoods with a local guide.',
    highlights: [
      '7 tasting stops across 3 neighbourhoods',
      'Al Batha Souq spice market visit',
      'Specialty coffee in Olaya district',
      'Meet local restaurant families',
    ],
    heroImage: IMGS.arabic_food,
    images: [IMGS.arabic_food, IMGS.souq, IMGS.coffee_arabic],
    pricePerPerson: 200,
    currency: 'SAR',
    maxGroupSize: 10,
    minGroupSize: 2,
    stops: [
      { order: 1, placeName: 'Al Batha Souq', duration: 45, description: 'Spice market & dried fruits.', timeSlot: '5:30 PM' },
      { order: 2, placeName: 'Old Batha Restaurant', duration: 60, description: 'Mutabbaq & Balalit tasting.', timeSlot: '6:30 PM' },
      { order: 3, placeName: 'Sulaimaniyah Street', duration: 60, description: 'Bukhari rice & Mandi.', timeSlot: '7:45 PM' },
      { order: 4, placeName: 'Olaya Specialty Café', duration: 45, description: 'Saudi pour-over & Luqaimat.', timeSlot: '9:00 PM' },
    ],
    departureLocation: 'Al Batha Metro Station, Riyadh',
    departureTime: '5:30 PM',
    returnTime: '10:00 PM',
    totalDuration: 4.5,
    difficulty: 'easy',
    included: ['All tastings', 'Local guide', 'Water'],
    excluded: ['Hotel pickup', 'Extra purchases'],
    guideName: 'Riyadh Walks',
    guideRating: 4.7,
    category: 'Food & Culture',
    tags: ['food', 'riyadh', 'street-food', 'souq', 'culture', 'batha'],
    rating: 4.7,
    reviewCount: 198,
    bookingsCount: 420,
    status: 'active',
  },
  {
    title: 'Riyadh by Night — KAFD Skyline & Kingdom Tower',
    description:
      'See Riyadh’s futuristic skyline at its most spectacular. An evening experience combining the Kingdom Tower sky bridge with a walking tour of the KAFD Financial District and dinner at Boulevard Riyadh City.',
    highlights: [
      'Kingdom Tower sky bridge at sunset',
      'KAFD after-dark architecture walk',
      'Rooftop dinner with panoramic city views',
      'Light installations at Boulevard Riyadh City',
    ],
    heroImage: IMGS.riyadh_sky,
    images: [IMGS.riyadh_sky, IMGS.riyadh_sky2, IMGS.riyadh_night],
    pricePerPerson: 350,
    currency: 'SAR',
    maxGroupSize: 10,
    minGroupSize: 2,
    stops: [
      { order: 1, placeName: 'Kingdom Tower Sky Bridge', duration: 60, description: 'Panoramic views from the 99th floor.', timeSlot: '6:30 PM' },
      { order: 2, placeName: 'KAFD District Walk', duration: 75, description: 'Guided architecture tour.', timeSlot: '8:00 PM' },
      { order: 3, placeName: 'Boulevard Riyadh City', duration: 90, description: 'Dinner + light art installations.', timeSlot: '9:30 PM' },
    ],
    departureLocation: 'Kingdom Tower Main Entrance, Olaya, Riyadh',
    departureTime: '6:30 PM',
    returnTime: '11:30 PM',
    totalDuration: 5,
    difficulty: 'easy',
    included: ['Sky bridge tickets', 'Guide', 'Set dinner menu'],
    excluded: ['Transport to start point'],
    guideName: 'Riyadh Nights Experience',
    guideRating: 4.8,
    category: 'City & Architecture',
    tags: ['riyadh', 'night', 'skyline', 'KAFD', 'luxury', 'kingdom-tower'],
    rating: 4.8,
    reviewCount: 155,
    bookingsCount: 310,
    status: 'active',
  },
  {
    title: 'Wadi Hanifa Valley Walk & Picnic',
    description:
      'Explore the ancient 120km Wadi Hanifa that cuts through the heart of Riyadh. A relaxed guided walk through the restored wetlands and date palm groves, ending with a traditional picnic.',
    highlights: [
      'Guided walk through restored wetlands',
      'Date palm grove & irrigation systems',
      'Birdwatching and green corridor views',
      'Traditional Saudi picnic spread under palms',
    ],
    heroImage: IMGS.wadi,
    images: [IMGS.wadi, IMGS.desert_hike, IMGS.arabic_food],
    pricePerPerson: 120,
    currency: 'SAR',
    maxGroupSize: 14,
    minGroupSize: 2,
    stops: [
      { order: 1, placeName: 'Wadi Hanifa North Access', duration: 15, description: 'Welcome & trail briefing.', timeSlot: '4:30 PM' },
      { order: 2, placeName: 'Wetland Corridor', duration: 90, description: 'Guided wetland walk.', timeSlot: '5:00 PM' },
      { order: 3, placeName: 'Date Palm Grove', duration: 45, description: 'Irrigation systems & birdwatching.', timeSlot: '6:30 PM' },
      { order: 4, placeName: 'Picnic Terrace', duration: 60, description: 'Traditional Saudi picnic.', timeSlot: '7:15 PM' },
    ],
    departureLocation: 'Wadi Hanifa North Access, Diriyah, Riyadh',
    departureTime: '4:30 PM',
    returnTime: '8:30 PM',
    totalDuration: 4,
    difficulty: 'easy',
    included: ['Guide', 'Picnic spread', 'Water'],
    excluded: ['Hotel pickup'],
    guideName: 'Riyadh Nature Guides',
    guideRating: 4.7,
    category: 'Nature',
    tags: ['wadi', 'nature', 'walking', 'riyadh', 'family', 'picnic'],
    rating: 4.7,
    reviewCount: 98,
    bookingsCount: 215,
    status: 'active',
  },
];

// ─── RENTALS ─────────────────────────────────────────────────────────────────

const SEED_RENTALS = [
  {
    title: 'Restored Najdi Mud House — Diriyah Heritage Zone',
    type: 'Chalet',
    price: 1400,
    currency: 'SAR',
    capacity: 6,
    locationName: 'At-Turaif, Diriyah, Riyadh',
    city: 'Riyadh',
    image: IMGS.diriyah,
    images: [IMGS.diriyah, IMGS.mud_wall, IMGS.wadi],
    rating: 5.0,
    reviewCount: 74,
    bedrooms: 2,
    description: 'A beautifully restored Najdi mud house inside the Diriyah Heritage Zone. Wake up to the call to prayer with views over Wadi Hanifa.',
    amenities: ['AC', 'WiFi', 'Parking', 'Traditional Courtyard', 'Kitchen', 'Heritage Decor', 'Majlis'],
    cleaningFee: 150,
    serviceFee: 120,
    lat: 24.7333,
    lng: 46.5744,
    mapQuery: 'At-Turaif+Diriyah+Riyadh',
    contactName: 'Norah Al-Otaibi',
    contactPhone: '+966501110001',
    contactWhatsapp: '+966501110001',
    verified: true,
    available: true,
  },
  {
    title: 'Premium Desert Kashta — Al Thumamah',
    type: 'Kashta',
    price: 850,
    currency: 'SAR',
    capacity: 20,
    locationName: 'Al Thumamah National Park, North Riyadh',
    city: 'Riyadh',
    image: IMGS.desert_camp,
    images: [IMGS.desert_camp, IMGS.desert_night, IMGS.desert_red],
    rating: 4.8,
    reviewCount: 142,
    description: 'A premium kashta set among rolling red dunes 30 minutes north of Riyadh. Fully equipped outdoor kitchen, BBQ station, and private fire pit.',
    amenities: ['BBQ', 'Outdoor Kitchen', 'Firepit', 'Parking', 'Restroom', 'Seating Area', 'Generator'],
    cleaningFee: 100,
    serviceFee: 80,
    lat: 24.898,
    lng: 46.712,
    mapQuery: 'Al+Thumamah+National+Park+Riyadh',
    contactName: 'Mohammed Al-Shehri',
    contactPhone: '+966501234567',
    contactWhatsapp: '+966501234567',
    verified: true,
    available: true,
  },
  {
    title: 'Luxury Pool Chalet — North Riyadh (Al Yasmin)',
    type: 'Chalet',
    price: 2200,
    currency: 'SAR',
    capacity: 12,
    locationName: 'Al Yasmin District, North Riyadh',
    city: 'Riyadh',
    image: IMGS.pool_chalet,
    images: [IMGS.pool_chalet, IMGS.riyadh_sky, IMGS.riyadh_sky2],
    rating: 4.7,
    reviewCount: 89,
    bedrooms: 4,
    description: 'A fully-equipped luxury chalet in Al Yasmin district with private pool, home cinema, and outdoor BBQ — ideal for family gatherings.',
    amenities: ['Pool', 'WiFi', 'Kitchen', 'AC', 'BBQ', 'Parking', 'Home Cinema', 'Kids Play Area'],
    cleaningFee: 250,
    serviceFee: 180,
    lat: 24.8240,
    lng: 46.6380,
    mapQuery: 'Al+Yasmin+District+Riyadh',
    contactName: 'Turki Al-Dosari',
    contactPhone: '+966509991112',
    contactWhatsapp: '+966509991112',
    verified: true,
    available: true,
  },
  {
    title: 'Wadi Hanifa Glamping — Stargazing Bell Tents',
    type: 'Camp',
    price: 650,
    currency: 'SAR',
    capacity: 6,
    locationName: 'Wadi Hanifa, West Riyadh',
    city: 'Riyadh',
    image: IMGS.luxury_tent,
    images: [IMGS.luxury_tent, IMGS.desert_night, IMGS.wadi],
    rating: 4.9,
    reviewCount: 210,
    bedrooms: 2,
    description: 'Luxury bell tents beside the ancient Wadi Hanifa valley — just 20 minutes from central Riyadh. Perfect stargazing, campfire dinners, and zero city noise.',
    amenities: ['Luxury Bell Tent', 'Stargazing Deck', 'Firepit', 'Breakfast Included', 'Parking', 'Restroom'],
    cleaningFee: 80,
    serviceFee: 65,
    lat: 24.5900,
    lng: 46.5400,
    mapQuery: 'Wadi+Hanifa+Riyadh',
    contactName: 'Salma Al-Rashidi',
    contactPhone: '+966554321098',
    contactWhatsapp: '+966554321098',
    verified: true,
    available: true,
  },
  {
    title: 'Heritage Date Palm Farm Stay — Diriyah Outskirts',
    type: 'Farm',
    price: 900,
    currency: 'SAR',
    capacity: 16,
    locationName: 'Al Diriyah Outskirts, Riyadh',
    city: 'Riyadh',
    image: IMGS.farm_palm,
    images: [IMGS.farm_palm, IMGS.diriyah, IMGS.mud_wall],
    rating: 4.6,
    reviewCount: 58,
    bedrooms: 3,
    description: 'A traditional Saudi farm with ancient date palms, a private well, and a Najdi-style majlis. Ideal for large family weekend gatherings away from the city.',
    amenities: ['Majlis', 'BBQ', 'Date Palm Garden', 'Kitchen', 'Parking', 'WiFi', 'Private Well'],
    cleaningFee: 120,
    serviceFee: 90,
    lat: 24.6800,
    lng: 46.5600,
    mapQuery: 'Al+Diriyah+Farm+Riyadh',
    contactName: 'Abdullah Al-Majed',
    contactPhone: '+966561239876',
    contactWhatsapp: '+966561239876',
    available: true,
  },
];

// ─── EVENTS ──────────────────────────────────────────────────────────────────

const SEED_EVENTS = [
  {
    title: 'Riyadh Season 2026',
    description: 'The world’s biggest entertainment season — themed zones across Riyadh including Boulevard World, Winter Wonderland, and major live experiences.',
    date: new Date('2026-10-01'),
    endDate: new Date('2027-01-01'),
    time: '4:00 PM',
    locationName: 'Multiple Zones, Riyadh',
    city: 'Riyadh',
    category: 'Festival',
    image: IMGS.festival,
    color: '#f59e0b',
    isFree: false,
    fee: 0,
    currency: 'SAR',
    website: 'https://riyadhseason.sa',
    hours: '4:00 PM – 2:00 AM',
    mapQuery: 'Riyadh+Season+Boulevard+World',
  },
  {
    title: 'Saudi Formula E — Diriyah ePrix',
    description: 'The season-opening round of the ABB FIA Formula E World Championship on the iconic Diriyah street circuit beside the UNESCO heritage site.',
    date: new Date('2027-01-24'),
    endDate: new Date('2027-01-25'),
    time: '2:00 PM',
    locationName: 'Ad Diriyah Circuit, Riyadh',
    city: 'Riyadh',
    category: 'Sports',
    image: IMGS.racing,
    color: '#ef4444',
    isFree: false,
    fee: 350,
    currency: 'SAR',
    website: 'https://www.fiaformulae.com',
    hours: 'Gates open at 12:00 PM',
    mapQuery: 'Ad+Diriyah+Street+Circuit+Riyadh',
  },
  {
    title: 'Gamers8 — The Land of Heroes 2026',
    description: 'The world’s largest gaming and esports festival at Boulevard Riyadh City with tournaments, live activations, and prize pools.',
    date: new Date('2026-08-01'),
    endDate: new Date('2026-09-27'),
    time: '2:00 PM',
    locationName: 'Boulevard Riyadh City',
    city: 'Riyadh',
    category: 'Gaming & Esports',
    image: IMGS.gaming_event,
    color: '#8b5cf6',
    isFree: true,
    fee: 0,
    currency: 'SAR',
    website: 'https://gamers8.com',
    hours: '2:00 PM – Midnight',
    mapQuery: 'Boulevard+Riyadh+City',
  },
  {
    title: 'Diriyah Art Futures 2026',
    description: 'A contemporary art and design festival at the foot of the UNESCO At-Turaif district with global and Saudi artists.',
    date: new Date('2026-11-14'),
    endDate: new Date('2026-11-28'),
    time: '5:00 PM',
    locationName: 'Diriyah Gate, Riyadh',
    city: 'Riyadh',
    category: 'Arts & Culture',
    image: IMGS.diriyah,
    color: '#ec4899',
    isFree: false,
    fee: 90,
    currency: 'SAR',
    hours: '5:00 PM – 11:00 PM',
    mapQuery: 'Diriyah+Gate+Riyadh',
  },
  {
    title: 'Riyadh Coffee Week',
    description: 'A citywide celebration of specialty coffee, roasting, latte art, and café culture across Riyadh.',
    date: new Date('2026-12-05'),
    endDate: new Date('2026-12-12'),
    time: '10:00 AM',
    locationName: 'Various Cafés, Riyadh',
    city: 'Riyadh',
    category: 'Food & Drink',
    image: IMGS.coffee_arabic,
    color: '#b45309',
    isFree: true,
    fee: 0,
    currency: 'SAR',
    hours: '10:00 AM – 10:00 PM',
    mapQuery: 'Riyadh+Coffee+Week',
  },
  {
    title: 'Weekend Desert Run — Al Thumamah',
    description: 'A community off-road meetup for 4x4 enthusiasts with convoy etiquette, recovery demos, and sunset photos.',
    date: new Date('2026-09-18'),
    endDate: new Date('2026-09-18'),
    time: '5:00 AM',
    locationName: 'Al Thumamah National Park',
    city: 'Riyadh',
    category: 'Outdoor',
    image: IMGS.desert_dunes,
    color: '#f97316',
    isFree: true,
    fee: 0,
    currency: 'SAR',
    hours: '5:00 AM – 11:00 AM',
    mapQuery: 'Al+Thumamah+National+Park+Riyadh',
  },
  {
    title: 'Riyadh Tech Meetup Night',
    description: 'A monthly meetup for developers, founders, and designers with lightning talks and networking.',
    date: new Date('2026-10-20'),
    endDate: new Date('2026-10-20'),
    time: '7:00 PM',
    locationName: 'Riyadh Front, North Riyadh',
    city: 'Riyadh',
    category: 'Technology',
    image: IMGS.riyadh_front,
    color: '#2563eb',
    isFree: true,
    fee: 0,
    currency: 'SAR',
    hours: '7:00 PM – 10:00 PM',
    mapQuery: 'Riyadh+Front+North+Riyadh',
  },
];

// ─── PLACES ──────────────────────────────────────────────────────────────────

const SEED_PLACES = [
  {
    name: 'At-Turaif District — Diriyah',
    city: 'Riyadh',
    description: 'UNESCO World Heritage Site and the original capital of the first Saudi state.',
    categoryTags: ['Heritage', 'Parks'],
    coordinates: { lat: 24.7333, lng: 46.5744 },
    photos: [IMGS.diriyah, IMGS.mud_wall, IMGS.diriyah2],
    category: 'Heritage',
    image: IMGS.diriyah,
    avgCost: 75,
    duration: 180,
    accessType: 'ticketed',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '09:00', close: '22:00' },
    ratingSummary: { avgRating: 4.9, reviewCount: 3800 },
  },
  {
    name: 'Kingdom Centre Tower',
    city: 'Riyadh',
    description: 'Riyadh’s iconic landmark with a panoramic sky bridge view.',
    categoryTags: ['Cafés', 'Restaurants'],
    coordinates: { lat: 24.7149, lng: 46.6747 },
    photos: [IMGS.riyadh_sky, IMGS.riyadh_sky2],
    category: 'Landmark',
    image: IMGS.riyadh_sky,
    avgCost: 69,
    duration: 90,
    accessType: 'ticketed',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '09:00', close: '23:00' },
    ratingSummary: { avgRating: 4.7, reviewCount: 6200 },
  },
  {
    name: 'National Museum of Saudi Arabia',
    city: 'Riyadh',
    description: 'World-class galleries spanning the story of the Arabian Peninsula.',
    categoryTags: ['Parks'],
    coordinates: { lat: 24.6903, lng: 46.7117 },
    photos: [IMGS.riyadh_sky2, IMGS.mud_wall],
    category: 'Culture',
    image: IMGS.riyadh_sky2,
    avgCost: 15,
    duration: 180,
    accessType: 'ticketed',
    isFamilySuitable: true,
    isTrending: false,
    status: 'active',
    openingHours: { open: '09:00', close: '23:00' },
    ratingSummary: { avgRating: 4.8, reviewCount: 4400 },
  },
  {
    name: 'Al Thumamah National Park',
    city: 'Riyadh',
    description: 'Protected desert park with red sand dunes and hiking trails.',
    categoryTags: ['Nature', 'Parks', 'Sports'],
    coordinates: { lat: 24.898, lng: 46.712 },
    photos: [IMGS.desert_hike, IMGS.desert_red, IMGS.desert_dunes],
    category: 'Nature',
    image: IMGS.desert_hike,
    avgCost: 0,
    duration: 240,
    accessType: 'free',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '06:00', close: '23:00' },
    ratingSummary: { avgRating: 4.7, reviewCount: 2100 },
  },
  {
    name: 'Wadi Hanifa & Wetlands',
    city: 'Riyadh',
    description: 'A restored natural valley through the heart of Riyadh.',
    categoryTags: ['Nature', 'Parks', 'Sports'],
    coordinates: { lat: 24.5900, lng: 46.5400 },
    photos: [IMGS.wadi, IMGS.desert_hike],
    category: 'Nature',
    image: IMGS.wadi,
    avgCost: 0,
    duration: 120,
    accessType: 'free',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '05:00', close: '23:00' },
    ratingSummary: { avgRating: 4.8, reviewCount: 1760 },
  },
  {
    name: 'Boulevard Riyadh City',
    city: 'Riyadh',
    description: 'Entertainment district with restaurants, live shows, and open spaces.',
    categoryTags: ['Restaurants', 'Cafés', 'Parks'],
    coordinates: { lat: 24.7668, lng: 46.6316 },
    photos: [IMGS.festival, IMGS.riyadh_night],
    category: 'Entertainment',
    image: IMGS.festival,
    avgCost: 50,
    duration: 180,
    accessType: 'free',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '16:00', close: '02:00' },
    ratingSummary: { avgRating: 4.6, reviewCount: 5100 },
  },
  {
    name: 'Najd Village Restaurant',
    city: 'Riyadh',
    description: 'Authentic Saudi hospitality and Najdi cuisine in a traditional setting.',
    categoryTags: ['Restaurants', 'Cafés'],
    coordinates: { lat: 24.7391, lng: 46.6845 },
    photos: [IMGS.arabic_food, IMGS.souq],
    category: 'Food',
    image: IMGS.arabic_food,
    avgCost: 120,
    duration: 90,
    accessType: 'free',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '12:00', close: '00:00' },
    ratingSummary: { avgRating: 4.6, reviewCount: 8400 },
  },
  {
    name: 'Riyadh Front',
    city: 'Riyadh',
    description: 'A modern mega-complex featuring premium retail and café promenades.',
    categoryTags: ['Cafés', 'Restaurants', 'Parks'],
    coordinates: { lat: 24.8396, lng: 46.7323 },
    photos: [IMGS.riyadh_sky2, IMGS.coffee_arabic],
    category: 'Shopping',
    image: IMGS.riyadh_sky2,
    avgCost: 0,
    duration: 180,
    accessType: 'free',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '08:00', close: '02:00' },
    ratingSummary: { avgRating: 4.8, reviewCount: 10200 },
  },
  {
    name: 'Al Bujairi Heritage Park',
    city: 'Riyadh',
    description: 'A landscaped park overlooking At-Turaif with outdoor dining and specialty coffee.',
    categoryTags: ['Parks', 'Cafés', 'Restaurants'],
    coordinates: { lat: 24.7335, lng: 46.5746 },
    photos: [IMGS.diriyah2, IMGS.coffee_arabic],
    category: 'Parks',
    image: IMGS.diriyah2,
    avgCost: 0,
    duration: 120,
    accessType: 'free',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '16:00', close: '02:00' },
    ratingSummary: { avgRating: 4.7, reviewCount: 5400 },
  },
  {
    name: 'Nofa Wildlife Park',
    city: 'Riyadh',
    description: 'Safari-style wildlife park with open habitats and family activities.',
    categoryTags: ['Nature', 'Parks'],
    coordinates: { lat: 24.2389, lng: 45.9863 },
    photos: [IMGS.nofa, IMGS.wadi, IMGS.desert_hike],
    category: 'Nature',
    image: IMGS.nofa,
    avgCost: 150,
    duration: 180,
    accessType: 'ticketed',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '08:00', close: '23:00' },
    ratingSummary: { avgRating: 4.5, reviewCount: 3100 },
  },
  {
    name: 'Diriyah Gate Visitor Plaza',
    city: 'Riyadh',
    description: 'Visitor hub with cafés, exhibitions, and access to Diriyah landmarks.',
    categoryTags: ['Cafés', 'Parks', 'Restaurants'],
    coordinates: { lat: 24.7338, lng: 46.5751 },
    photos: [IMGS.diriyah2, IMGS.bujairi],
    category: 'Heritage',
    image: IMGS.bujairi,
    avgCost: 35,
    duration: 90,
    accessType: 'free',
    isFamilySuitable: true,
    isTrending: true,
    status: 'active',
    openingHours: { open: '10:00', close: '23:00' },
    ratingSummary: { avgRating: 4.8, reviewCount: 5200 },
  },
];

// ─── COMMUNITIES ─────────────────────────────────────────────────────────────

const SEED_COMMUNITIES = [
  {
    name: 'Riyadh Explorers',
    nameAr: 'مستكشفو الرياض',
    slug: 'riyadh-explorers',
    icon: '🏙️',
    image: IMGS.riyadh_sky,
    memberCount: 7840,
    description: 'Discovering Riyadh’s hidden gems.',
    descriptionAr: 'استكشاف كنوز الرياض المخفية.',
    category: 'City',
    tags: ['riyadh', 'city', 'art', 'weekend', 'explore'],
    isVerified: true,
    isPublic: true,
    rules: ['شارك محتوى أصلياً من الرياض فقط', 'احترم جميع الأعضاء', 'لا ترويج تجاري بدون إشعار مسبق'],
    stats: { postsCount: 1240, activeMembersThisMonth: 2100, weeklyGrowth: 4.2 },
    recentPosts: [
      { image: IMGS.riyadh_sky, caption: 'أبراج الرياض عند الغروب 🌇', likes: 892, commentsCount: 74 },
      { image: IMGS.diriyah, caption: 'جولة في الدرعية التراثية 🏰', likes: 1034, commentsCount: 118 },
      { image: IMGS.riyadh_sky2, caption: 'حي KAFD بعد المغرب 📸', likes: 567, commentsCount: 43 },
    ],
  },
  {
    name: 'Riyadh Heritage Society',
    nameAr: 'جمعية تراث الرياض',
    slug: 'riyadh-heritage',
    icon: '🏺',
    image: IMGS.diriyah,
    memberCount: 4120,
    description: 'Preserving Riyadh’s Najdi architectural heritage.',
    descriptionAr: 'الحفاظ على الإرث المعماري النجدي في الرياض.',
    category: 'Heritage',
    tags: ['heritage', 'najdi', 'diriyah', 'history', 'architecture'],
    isVerified: true,
    isPublic: true,
    rules: ['اذكر المصادر عند نشر معلومات تاريخية', 'لا تصوير بدون إذن داخل المواقع الأثرية', 'شارك قصص شخصية وتجارب حقيقية'],
    stats: { postsCount: 680, activeMembersThisMonth: 890, weeklyGrowth: 2.8 },
    recentPosts: [
      { image: IMGS.diriyah, caption: 'قصر سلوى — قلب الدرعية الأول 🏰', likes: 1345, commentsCount: 234 },
      { image: IMGS.mud_wall, caption: 'الطين والحجر — عمارة نجدية 🧱', likes: 789, commentsCount: 112 },
      { image: IMGS.diriyah2, caption: 'قصر المربع — تاريخ مصور', likes: 623, commentsCount: 89 },
    ],
  },
  {
    name: 'Riyadh Hikers',
    nameAr: 'مشاة الرياض',
    slug: 'riyadh-hikers',
    icon: '🥾',
    image: IMGS.desert_hike,
    memberCount: 9250,
    description: 'Weekly group hikes in and around Riyadh.',
    descriptionAr: 'رحلات مشي أسبوعية منظمة في الرياض ومحيطها.',
    category: 'Outdoor',
    tags: ['hiking', 'thumamah', 'wadi-hanifa', 'fitness', 'riyadh'],
    isVerified: true,
    isPublic: true,
    rules: ['أبلغ عن حالة المسار بعد كل رحلة', 'لا مشي منفرداً بدون تسجيل مع شريك', 'احترم البيئة — لا تترك نفايات', 'شارك موقعك GPS لسلامة الجميع'],
    stats: { postsCount: 2340, activeMembersThisMonth: 3800, weeklyGrowth: 6.5 },
    recentPosts: [
      { image: IMGS.desert_hike, caption: '🌄 شروق الشمس من مسار التمامة', likes: 1456, commentsCount: 198 },
      { image: IMGS.wadi, caption: 'مسار وادي حنيفة الكامل', likes: 987, commentsCount: 143 },
      { image: IMGS.desert_red, caption: 'رحلة جمعة في التمامة 🏕️', likes: 743, commentsCount: 89 },
    ],
  },
  {
    name: 'Riyadh Food Hunters',
    nameAr: 'صيادو أكل الرياض',
    slug: 'riyadh-food-hunters',
    icon: '🍽️',
    image: IMGS.arabic_food,
    memberCount: 18400,
    description: 'Honest restaurant reviews and hidden street food spots.',
    descriptionAr: 'مراجعات صادقة للمطاعم وأكل الرياض الشعبي.',
    category: 'Food',
    tags: ['food', 'riyadh', 'mandi', 'kabsa', 'restaurants', 'street-food'],
    isVerified: true,
    isPublic: true,
    rules: ['مراجعات صادقة فقط', 'أضف الموقع والسعر التقريبي في كل منشور', 'الصور يجب أن تكون لك'],
    stats: { postsCount: 4200, activeMembersThisMonth: 7500, weeklyGrowth: 8.1 },
    recentPosts: [
      { image: IMGS.arabic_food, caption: 'أفضل 5 مطاعم مندي في الرياض 2026', likes: 4210, commentsCount: 834 },
      { image: IMGS.souq, caption: 'مطبق البطحاء بـ 12 ريال فقط', likes: 2987, commentsCount: 512 },
      { image: IMGS.coffee_arabic, caption: 'أفضل كافيهات Specialty في الرياض', likes: 1876, commentsCount: 278 },
    ],
  },
  {
    name: 'Riyadh Desert Drivers',
    nameAr: 'سائقو صحراء الرياض',
    slug: 'riyadh-desert-drivers',
    icon: '🏜️',
    image: IMGS.desert_dunes,
    memberCount: 6300,
    description: 'Off-road adventures, dune bashing, and 4x4 convoy planning.',
    descriptionAr: 'مغامرات الطرق الوعرة وتنظيم القوافل الصحراوية.',
    category: 'Off-road',
    tags: ['4x4', 'offroad', 'dunes', 'thumamah', 'empty-quarter', 'riyadh'],
    isVerified: false,
    isPublic: true,
    rules: ['سافر دائماً في قوافل لا تقل عن 3 مركبات', 'شارك قائمة معدات الإنقاذ قبل كل رحلة', 'احترم المناطق الطبيعية المحمية', 'أبلغ عن حالة الطريق بعد العودة'],
    stats: { postsCount: 1890, activeMembersThisMonth: 2200, weeklyGrowth: 3.4 },
    recentPosts: [
      { image: IMGS.desert_dunes, caption: 'قافلة 20 سيارة في الربع الخالي 🏜️', likes: 2134, commentsCount: 287 },
      { image: IMGS.desert_night, caption: 'مخيم جمعة في التمامة', likes: 1456, commentsCount: 198 },
      { image: IMGS.desert_red, caption: 'تقرير طريق الرياض–الدوادمي 🚙', likes: 987, commentsCount: 134 },
    ],
  },
  {
    name: 'Riyadh Coffee Scene',
    nameAr: 'مجلس قهوة الرياض',
    slug: 'riyadh-coffee',
    icon: '☕',
    image: IMGS.coffee_arabic,
    memberCount: 11200,
    description: 'Specialty coffee culture and honest café reviews.',
    descriptionAr: 'ثقافة القهوة المتخصصة ومراجعات صادقة للكافيهات.',
    category: 'Food & Culture',
    tags: ['coffee', 'cafe', 'specialty', 'riyadh', 'barista'],
    isVerified: true,
    isPublic: true,
    rules: ['شارك تجربتك الشخصية بصدق', 'أضف اسم الكافيه والموقع', 'صور حقيقية بدون فلتر مبالغ فيه'],
    stats: { postsCount: 3100, activeMembersThisMonth: 4800, weeklyGrowth: 5.9 },
    recentPosts: [
      { image: IMGS.coffee_arabic, caption: 'أفضل 10 كافيهات Specialty في الرياض 2026', likes: 3456, commentsCount: 567 },
      { image: IMGS.arabic_food, caption: 'جربت القهوة اليمنية المختصة في البطحاء', likes: 1234, commentsCount: 189 },
    ],
  },
  {
    name: 'Riyadh Tech Innovators',
    nameAr: 'مبتكرو التقنية بالرياض',
    slug: 'riyadh-tech',
    icon: '💻',
    image: IMGS.riyadh_sky2,
    memberCount: 14500,
    description: 'Connecting developers, designers, and tech enthusiasts in Riyadh.',
    descriptionAr: 'ربط المطورين والمصممين وعشاق التقنية في الرياض.',
    category: 'Technology',
    tags: ['tech', 'startups', 'coding', 'riyadh', 'developers'],
    isVerified: true,
    isPublic: true,
    rules: ['لا سبام أو عروض توظيف مباشرة بدون تفاصيل كاملة', 'شارك المعرفة وكن متعاوناً', 'الترويج للمشاريع الشخصية في يوم الجمعة فقط'],
    stats: { postsCount: 5200, activeMembersThisMonth: 9100, weeklyGrowth: 12.4 },
    recentPosts: [
      { image: IMGS.riyadh_sky2, caption: 'ملخص هاكاثون طويق للذكاء الاصطناعي 🚀', likes: 2314, commentsCount: 412 },
      { image: IMGS.coffee_arabic, caption: 'أفضل كافيهات للعمل عن بعد والبرمجة ☕', likes: 1845, commentsCount: 320 },
    ],
  },
];

// ─── SEED FUNCTION ────────────────────────────────────────────────────────────

const seedDatabase = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/:\/\/.*@/, '://***@'));
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected successfully');

    const modelNames = mongoose.modelNames();
    console.log('📦 Registered models:', modelNames.join(', '));

    console.log('\n🧹 Wiping old data...');
    const [t, r, e, p, c] = await Promise.all([
      Tour.deleteMany({}),
      Rental.deleteMany({}),
      Event.deleteMany({}),
      Place.deleteMany({}),
      Community.deleteMany({}),
    ]);

    console.log(
      `Deleted — Tours:${t.deletedCount} Rentals:${r.deletedCount} Events:${e.deletedCount} Places:${p.deletedCount} Communities:${c.deletedCount}`
    );

    console.log('\n👥 Inserting Communities...');
    const communities = await Community.insertMany(SEED_COMMUNITIES, { ordered: false });
    console.log(`✔ ${communities.length} communities`);

    console.log('🧭 Inserting Tours...');
    const tours = await Tour.insertMany(
      SEED_TOURS.map((t, i) => ({
        ...t,
        slug: t.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 60) + '-' + i,
      })),
      { ordered: false }
    );
    console.log(`✔ ${tours.length} tours`);

    console.log('🏕️ Inserting Rentals...');
    const rentals = await Rental.insertMany(SEED_RENTALS, { ordered: false });
    console.log(`✔ ${rentals.length} rentals`);

    console.log('🎆 Inserting Events...');
    let eventSuccessCount = 0;
    const communityBySlug = Object.fromEntries(
      communities.map((community: any) => [community.slug, community._id.toString()])
    );

    const eventCommunityMap: Record<string, string> = {
      'Riyadh Season 2026': communityBySlug['riyadh-explorers'] || communities[0]._id.toString(),
      'Saudi Formula E — Diriyah ePrix': communityBySlug['riyadh-explorers'] || communities[0]._id.toString(),
      'Gamers8 — The Land of Heroes 2026': communityBySlug['riyadh-tech'] || communities[0]._id.toString(),
      'Diriyah Art Futures 2026': communityBySlug['riyadh-heritage'] || communities[0]._id.toString(),
      'Riyadh Coffee Week': communityBySlug['riyadh-coffee'] || communities[0]._id.toString(),
      'Weekend Desert Run — Al Thumamah': communityBySlug['riyadh-desert-drivers'] || communities[0]._id.toString(),
      'Riyadh Tech Meetup Night': communityBySlug['riyadh-tech'] || communities[0]._id.toString(),
    };

    for (const ev of SEED_EVENTS) {
      try {
        await Event.create({
          ...ev,
          date: typeof ev.date === 'string' ? ev.date : ev.date.toISOString(),
          endDate: typeof ev.endDate === 'string' ? ev.endDate : ev.endDate.toISOString(),
          communityId: eventCommunityMap[ev.title] || communities[0]._id.toString(),
          createdBy: 'system-seed',
        });
        eventSuccessCount++;
      } catch (err: any) {
        console.error('✗ Event failed:', ev.title);
        if (err.errors) {
          Object.entries(err.errors).forEach(([field, e]: any) =>
            console.error(`→ ${field}: ${e.message}`)
          );
        } else {
          console.error(`→ ${err.message}`);
        }
      }
    }
    console.log(`✔ ${eventSuccessCount} events`);

    console.log('📍 Inserting Places...');
    let placeSuccessCount = 0;
    for (const pl of SEED_PLACES) {
      try {
        const fixedOpeningHours: Record<string, any> = {};
        if (pl.openingHours?.open) {
          fixedOpeningHours.everyday = { open: pl.openingHours.open, close: pl.openingHours.close };
        }

        await Place.create({
          ...pl,
          openingHours: fixedOpeningHours,
        });
        placeSuccessCount++;
      } catch (err: any) {
        console.error('✗ Place failed:', pl.name);
        if (err.errors) {
          Object.entries(err.errors).forEach(([field, e]: any) =>
            console.error(`→ ${field}: ${e.message}`)
          );
        } else {
          console.error(`→ ${err.message}`);
        }
      }
    }
    console.log(`✔ ${placeSuccessCount} places`);

    console.log('\n📊 Final verification:');
    const counts = await Promise.all([
      Tour.countDocuments(),
      Rental.countDocuments(),
      Event.countDocuments(),
      Place.countDocuments(),
      Community.countDocuments(),
    ]);

    console.log(
      `Tours: ${counts[0]} | Rentals: ${counts[1]} | Events: ${counts[2]} | Places: ${counts[3]} | Communities: ${counts[4]}`
    );

    if (counts.some(n => n === 0)) {
      console.warn('⚠️ WARNING: Some collections are still empty!');
    } else {
      console.log('\n🎉 All collections seeded successfully!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error?.message || error);
    if (error?.writeErrors) {
      error.writeErrors.forEach((e: any) => console.error('Write error:', e.errmsg));
    }
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDatabase();