import 'dotenv/config';
import mongoose from 'mongoose';
import { Tour } from '../src/models/Tour';

const getUpcomingFridays = (count: number): Date[] => {
  const dates: Date[] = [];
  const today = new Date();
  const d = new Date(today);
  // advance to next Friday
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  for (let i = 0; i < count; i++) {
    dates.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return dates;
};

const tours = [
  {
    title: 'Edge of the World Sunrise Hike',
    slug: 'edge-of-the-world-sunrise-hike',
    description:
      'Stand at the top of the ancient Tuwaiq escarpment and watch the sun rise over an endless desert horizon. This guided day hike takes you through rugged off-road terrain to one of Saudi Arabia\'s most breathtaking natural landmarks — the dramatic "Edge of the World" cliffs, 90 km from Riyadh.',
    highlights: [
      'Watch sunrise from 300-metre limestone cliffs',
      'Expert guide navigating 4x4 desert tracks',
      'Breakfast picnic at the cliff edge',
      'Learn about the geological history of Tuwaiq',
      'Perfect for photography enthusiasts',
    ],
    heroImage: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80',
      'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80',
    ],
    pricePerPerson: 399,
    currency: 'SAR',
    maxGroupSize: 12,
    minGroupSize: 2,
    stops: [
      {
        order: 1,
        placeName: 'Riyadh Assembly Point',
        duration: 15,
        description: 'Meet your guide and group at the designated Riyadh departure point. Safety briefing, 4x4 vehicle allocation, and equipment check.',
        timeSlot: '4:30 AM',
        image: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=400&q=80',
      },
      {
        order: 2,
        placeName: 'Desert Track Drive',
        duration: 90,
        description: 'Thrilling off-road drive through gravel plains and sandy dunes. Watch the sky shift from deep blue to amber as you head west.',
        timeSlot: '4:45 AM',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
      },
      {
        order: 3,
        placeName: 'Cliff Viewpoint',
        duration: 30,
        description: 'Arrive at the escarpment rim and walk along the cliff edge. The sheer 300-metre drop reveals an awe-inspiring valley stretching to the horizon.',
        timeSlot: '6:15 AM',
        image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=400&q=80',
      },
      {
        order: 4,
        placeName: 'Sunrise Spot',
        duration: 60,
        description: 'Settle at the best sunrise vantage point, enjoy a warm breakfast picnic with dates, Arabic coffee, and pastries while the sun climbs over the desert.',
        timeSlot: '6:45 AM',
        image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80',
      },
      {
        order: 5,
        placeName: 'Return Journey',
        duration: 90,
        description: 'Return drive back to Riyadh via a different desert route, with a stop at a scenic wadi for a final photo opportunity.',
        timeSlot: '7:45 AM',
        image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=80',
      },
    ],
    departureLocation: 'Riyadh — King Abdullah Financial District Parking',
    departureTime: '4:30 AM',
    returnTime: '10:00 AM',
    totalDuration: 5.5,
    difficulty: 'moderate',
    included: [
      '4x4 vehicle transport (round trip)',
      'Expert local guide',
      'Sunrise breakfast picnic',
      'Arabic coffee & dates',
      'Safety equipment & first aid kit',
    ],
    excluded: [
      'Personal travel insurance',
      'Hiking boots (recommended)',
      'Additional snacks or drinks',
    ],
    guideName: 'Abdullah Al-Rashid',
    guideAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abdullah',
    guideRating: 4.9,
    availableDates: getUpcomingFridays(8),
    category: 'Nature',
    tags: ['hiking', 'sunrise', 'desert', 'cliffs', 'photography', 'nature'],
    rating: 4.9,
    reviewCount: 142,
    bookingsCount: 320,
    status: 'active',
  },
  {
    title: 'Diriyah Heritage Walk',
    slug: 'diriyah-heritage-walk',
    description:
      'Journey through 300 years of Saudi history in the ancient mud-brick city of Diriyah. Walk through the UNESCO World Heritage Site of At-Turaif, learn about the founding of the first Saudi state, and discover the artisans bringing traditional crafts back to life.',
    highlights: [
      'Private access to At-Turaif UNESCO Heritage Site',
      'Expert historian guide with interactive storytelling',
      'Traditional Saudi lunch in a restored mud-brick house',
      'Visit to a live calligraphy and pottery workshop',
      'Panoramic views of Wadi Hanifah',
    ],
    heroImage: 'https://images.unsplash.com/photo-1564769625392-651b89c75c0a?w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1564769625392-651b89c75c0a?w=800&q=80',
      'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=800&q=80',
    ],
    pricePerPerson: 179,
    currency: 'SAR',
    maxGroupSize: 15,
    minGroupSize: 1,
    stops: [
      {
        order: 1,
        placeName: 'Diriyah Gate',
        duration: 20,
        description: 'Begin at the grand Diriyah Gate entrance. Meet your historian guide and receive your heritage booklet as you pass through the restored archway.',
        timeSlot: '9:00 AM',
        image: 'https://images.unsplash.com/photo-1564769625392-651b89c75c0a?w=400&q=80',
      },
      {
        order: 2,
        placeName: 'At-Turaif District',
        duration: 90,
        description: 'Explore the famous mud-brick palaces, mosques, and alleyways of At-Turaif. Your guide brings the first Saudi state to life with vivid storytelling.',
        timeSlot: '9:20 AM',
        image: 'https://images.unsplash.com/photo-1578895101408-1a36b834405b?w=400&q=80',
      },
      {
        order: 3,
        placeName: 'Artisan Quarter',
        duration: 45,
        description: 'Watch master craftsmen practice traditional calligraphy, weaving, and pottery. Try your hand at a short craft activity.',
        timeSlot: '10:50 AM',
        image: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&q=80',
      },
      {
        order: 4,
        placeName: 'Wadi Hanifah Terrace',
        duration: 60,
        description: 'Enjoy a traditional Saudi lunch — kabsa, jareesh, and fresh-baked khubz — on a shaded terrace overlooking the Wadi Hanifah valley.',
        timeSlot: '11:35 AM',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
      },
    ],
    departureLocation: 'Diriyah Gate — Main Visitor Entrance, Riyadh',
    departureTime: '9:00 AM',
    returnTime: '1:00 PM',
    totalDuration: 4,
    difficulty: 'easy',
    included: [
      'Heritage site entry tickets',
      'Historian guide (English & Arabic)',
      'Traditional Saudi lunch',
      'Heritage booklet',
      'Craft activity materials',
    ],
    excluded: [
      'Personal souvenirs',
      'Additional beverages',
      'Tips for guide',
    ],
    guideName: 'Norah Al-Qahtani',
    guideAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Norah',
    guideRating: 4.8,
    availableDates: getUpcomingFridays(8),
    category: 'Heritage',
    tags: ['history', 'culture', 'UNESCO', 'Diriyah', 'heritage', 'architecture'],
    rating: 4.8,
    reviewCount: 98,
    bookingsCount: 215,
    status: 'active',
  },
  {
    title: 'Desert Dunes Safari',
    slug: 'desert-dunes-safari',
    description:
      'Experience the raw power of the Arabian desert on this adrenaline-filled dune bashing and sandboarding adventure. Race across towering red dunes, try sandboarding down steep slopes, and end the evening with a Bedouin-style stargazing dinner in the Empty Quarter edge near Riyadh.',
    highlights: [
      'Thrilling 4x4 dune bashing with professional drivers',
      'Sandboarding on 80-metre dunes',
      'Camel ride at sunset',
      'Traditional Bedouin camp dinner under the stars',
      'Desert survival skills session',
    ],
    heroImage: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=800&q=80',
      'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
    ],
    pricePerPerson: 299,
    currency: 'SAR',
    maxGroupSize: 16,
    minGroupSize: 2,
    stops: [
      {
        order: 1,
        placeName: 'Al Thumamah Desert Park',
        duration: 20,
        description: 'Gather at the park entrance for a safety briefing and gear distribution. Meet your experienced 4x4 drivers.',
        timeSlot: '3:00 PM',
        image: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?w=400&q=80',
      },
      {
        order: 2,
        placeName: 'Red Dunes Zone',
        duration: 90,
        description: 'Brace yourself as your 4x4 tackles massive red sand dunes. Heart-stopping drops and climbs through Saudi\'s finest dune landscape.',
        timeSlot: '3:20 PM',
        image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=80',
      },
      {
        order: 3,
        placeName: 'Sandboarding Slope',
        duration: 60,
        description: 'Strap on a board and slide down a 80-metre dune face. Beginners welcome — your guide will coach you from the first run.',
        timeSlot: '4:50 PM',
        image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80',
      },
      {
        order: 4,
        placeName: 'Bedouin Camp',
        duration: 120,
        description: 'As the sun sets, arrive at a traditional Bedouin camp. Camel ride, Arabic coffee, and a feast of grilled meats, rice, and mezze under a canopy of stars.',
        timeSlot: '5:50 PM',
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      },
    ],
    departureLocation: 'Al Thumamah National Park Gate, North Riyadh',
    departureTime: '3:00 PM',
    returnTime: '9:00 PM',
    totalDuration: 6,
    difficulty: 'moderate',
    included: [
      '4x4 dune bashing (professional drivers)',
      'Sandboarding equipment',
      'Camel ride',
      'Traditional Bedouin dinner',
      'Arabic coffee & dates',
      'Safety helmets & pads',
    ],
    excluded: [
      'Alcoholic beverages',
      'Personal travel insurance',
      'Photography packages',
    ],
    guideName: 'Faisal Al-Otaibi',
    guideAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Faisal',
    guideRating: 4.9,
    availableDates: getUpcomingFridays(8),
    category: 'Adventure',
    tags: ['dunes', 'safari', 'adventure', 'sandboarding', 'Bedouin', 'stargazing'],
    rating: 4.7,
    reviewCount: 76,
    bookingsCount: 178,
    status: 'active',
  },
  {
    title: 'Riyadh Street Food Night Tour',
    slug: 'riyadh-street-food-night-tour',
    description:
      'Dive into Riyadh\'s vibrant street food scene after dark. This walking food tour winds through traditional souqs, illuminated night markets, and legendary local joints to taste the best of Saudi street cuisine — from shawarma to murtabak, and everything in between.',
    highlights: [
      'Taste 10+ authentic Saudi street foods',
      'Visit hidden gems known only to locals',
      'Story behind each dish from your foodie guide',
      'Night walk through the lit Al Baatha district',
      'Finish with kunafa at a legendary sweet shop',
    ],
    heroImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
    images: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
    ],
    pricePerPerson: 149,
    currency: 'SAR',
    maxGroupSize: 10,
    minGroupSize: 1,
    stops: [
      {
        order: 1,
        placeName: 'Souq Al Zal Night Market',
        duration: 30,
        description: 'Start at this buzzing night market. Sample traditional murtabak (stuffed pancake), freshly squeezed tamarind juice, and roasted nuts.',
        timeSlot: '7:00 PM',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
      },
      {
        order: 2,
        placeName: 'Al Baatha District',
        duration: 45,
        description: 'Wander through the illuminated Al Baatha streets, sampling kabsa sandwiches, ful medames, and simit bread from generations-old stalls.',
        timeSlot: '7:30 PM',
        image: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=400&q=80',
      },
      {
        order: 3,
        placeName: 'Takhassusi Street Shawarma Row',
        duration: 30,
        description: 'Battle of the shawarmas! Visit three legendary shawarma stands and vote for your favourite. The guide shares the secret of the perfect garlic sauce.',
        timeSlot: '8:15 PM',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80',
      },
      {
        order: 4,
        placeName: 'Jitan Pastry & Dates Shop',
        duration: 30,
        description: 'A Riyadh institution since 1972. Sample an extraordinary range of premium dates stuffed with nuts, chocolate, and cream, plus fresh-baked ma\'amoul.',
        timeSlot: '8:45 PM',
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
      },
      {
        order: 5,
        placeName: 'Hatab Kunafa Corner',
        duration: 30,
        description: 'End the tour at this iconic kunafa spot. Watch the chefs prepare the crispy cheese-filled pastry live, then devour a warm portion drizzled with rose-water syrup.',
        timeSlot: '9:15 PM',
        image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=400&q=80',
      },
    ],
    departureLocation: 'Souq Al Zal, Al Dirah, Riyadh',
    departureTime: '7:00 PM',
    returnTime: '10:00 PM',
    totalDuration: 3,
    difficulty: 'easy',
    included: [
      'All food tastings (10+ items)',
      'Expert food guide',
      'Bottled water throughout',
      'Food tour booklet with recipes',
    ],
    excluded: [
      'Additional food or drinks outside the tour stops',
      'Personal purchases at shops',
      'Transport to/from start point',
    ],
    guideName: 'Sara Al-Dossari',
    guideAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara',
    guideRating: 4.8,
    availableDates: (() => {
      // Every Thursday night for 8 weeks
      const dates: Date[] = [];
      const d = new Date();
      d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7 || 7));
      for (let i = 0; i < 8; i++) {
        const dt = new Date(d);
        dt.setHours(19, 0, 0, 0);
        dates.push(dt);
        d.setDate(d.getDate() + 7);
      }
      return dates;
    })(),
    category: 'Food',
    tags: ['food', 'street food', 'night tour', 'culture', 'local', 'shawarma', 'kunafa'],
    rating: 4.8,
    reviewCount: 63,
    bookingsCount: 131,
    status: 'active',
  },
];

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tripo';
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  await Tour.deleteMany({});
  console.log('🗑️  Cleared existing tours');

  const inserted = await Tour.insertMany(tours as any);
  console.log(`✅ Inserted ${inserted.length} tours:`);
  inserted.forEach(t => console.log(`   • ${t.title} (${t.category}) — ${t.pricePerPerson} SAR`));

  await mongoose.disconnect();
  console.log('✅ Done');
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
