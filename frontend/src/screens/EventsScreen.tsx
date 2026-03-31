import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Clock, ArrowLeft, Ticket, Globe, DollarSign, Info, Navigation } from 'lucide-react';

// ── SaudiEvent type ───────────────────────────────────────────────────────────

export interface SaudiEvent {
  id: string;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  location: string;
  city: string;
  description: string;
  image: string;
  color: string;
  price: string;
  isFree: boolean;
  admission: string;
  website: string;
  hours: string;
  gettingThere: string;
  mapQuery: string;
}

// ── Admin event management (localStorage) ────────────────────────────────────

const ADMIN_EVENTS_KEY = 'tripo_admin_events';
const DELETED_EVENT_IDS_KEY = 'tripo_deleted_event_ids';

export function getAdminEvents(): SaudiEvent[] {
  try { return JSON.parse(localStorage.getItem(ADMIN_EVENTS_KEY) || '[]'); } catch { return []; }
}
export function saveAdminEvent(event: SaudiEvent) {
  const existing = getAdminEvents();
  localStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify([event, ...existing]));
}
export function deleteAdminEvent(id: string) {
  const existing = getAdminEvents();
  localStorage.setItem(ADMIN_EVENTS_KEY, JSON.stringify(existing.filter(e => e.id !== id)));
}
export function getDeletedEventIds(): string[] {
  try { return JSON.parse(localStorage.getItem(DELETED_EVENT_IDS_KEY) || '[]'); } catch { return []; }
}
export function markEventDeleted(id: string) {
  const ids = getDeletedEventIds();
  if (!ids.includes(id)) localStorage.setItem(DELETED_EVENT_IDS_KEY, JSON.stringify([...ids, id]));
}
export function getAllEvents(): SaudiEvent[] {
  const adminEvents = getAdminEvents();
  const deletedIds = getDeletedEventIds();
  return [...adminEvents, ...(SAUDI_EVENTS as SaudiEvent[]).filter(e => !deletedIds.includes(e.id))];
}

// ── Mock data ────────────────────────────────────────────────────────────────

export const SAUDI_EVENTS = [
  {
    id: 'e1',
    title: 'LEAP Tech Conference',
    category: 'Business & Tech',
    startDate: '2026-02-09',
    endDate: '2026-02-12',
    location: 'Riyadh Front Exhibition Centre',
    city: 'Riyadh',
    description: "One of the world's largest tech conferences, showcasing AI, robotics, and innovation from global leaders",
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    color: '#6366f1',
    price: 'From SAR 1,500',
    isFree: false,
    admission: 'Purchase tickets at leap.gov.sa or through authorized resellers. General passes, VIP, and startup exhibition packages available.',
    website: 'https://leap.gov.sa',
    hours: '9:00 AM – 7:00 PM daily',
    gettingThere: 'Located at Riyadh Front on King Khalid Road. Free shuttle buses run from King Khalid International Airport and major hotels. Ample parking on-site.',
    mapQuery: 'Riyadh+Front+Exhibition+Centre+Riyadh',
  },
  {
    id: 'e3',
    title: 'Formula E Diriyah',
    category: 'Sports',
    startDate: '2026-02-27',
    endDate: '2026-02-28',
    location: 'Diriyah Circuit',
    city: 'Riyadh',
    description: 'Electric racing at the iconic Diriyah street circuit',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    color: '#ef4444',
    price: 'From SAR 200',
    isFree: false,
    admission: 'Tickets sold at fiaformulae.com and official ticket outlets. Categories: General Grandstand, Gold, Platinum, and Hospitality suites.',
    website: 'https://www.fiaformulae.com',
    hours: 'Race day gates open at 2:00 PM; races from 6:00 PM',
    gettingThere: 'Diriyah Circuit is 20 minutes from central Riyadh. Official shuttle buses from designated city points. Street parking is limited — pre-book parking through the official app.',
    mapQuery: 'Diriyah+Circuit+Riyadh',
  },
  {
    id: 'e4',
    title: 'Saudi National Day',
    category: 'National',
    startDate: '2026-09-23',
    endDate: '2026-09-23',
    location: 'Nationwide',
    city: 'All cities',
    description: 'Celebrations across Saudi Arabia with fireworks and cultural performances',
    image: 'https://images.unsplash.com/photo-1577985237258-6b5894e63777?w=800&q=80',
    color: '#10b981',
    price: 'Free',
    isFree: true,
    admission: 'All public celebrations are free and open to everyone. Main shows in Riyadh, Jeddah, Dammam, and other cities. No tickets required.',
    website: 'https://www.visitsaudi.com',
    hours: 'Events throughout the day; main fireworks at 9:00 PM',
    gettingThere: 'Public celebrations are held in city squares and corniche areas across the kingdom. Check local announcements for specific venues near you.',
    mapQuery: 'Riyadh+Saudi+Arabia',
  },
  {
    id: 'e5',
    title: 'Saudi Startup Summit',
    category: 'Business & Tech',
    startDate: '2026-05-18',
    endDate: '2026-05-19',
    location: 'King Abdulaziz Conference Center',
    city: 'Riyadh',
    description: 'The region\'s premier startup and venture capital event connecting founders, investors, and corporates',
    image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80',
    color: '#6366f1',
    price: 'From SAR 800 (startup passes available at SAR 200)',
    isFree: false,
    admission: 'Register online at saudistartups.sa. Startup founders can apply for discounted passes. Investor and corporate tickets include networking dinners.',
    website: 'https://saudistartups.sa',
    hours: '8:30 AM – 6:00 PM',
    gettingThere: 'King Abdulaziz Conference Center is in central Riyadh, near King Fahd Road. Accessible by Metro Line 3 (Al Woroud station). Valet parking available.',
    mapQuery: 'King+Abdulaziz+Conference+Center+Riyadh',
  },
  {
    id: 'e6',
    title: 'AlUla Moments',
    category: 'Culture',
    startDate: '2026-01-15',
    endDate: '2026-03-15',
    location: 'AlUla',
    city: 'AlUla',
    description: 'Desert festivals, stargazing, and ancient Nabataean heritage tours',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
    color: '#f97316',
    price: 'From SAR 95 (site entry); packages from SAR 500',
    isFree: false,
    admission: 'Book heritage site entry and experience packages at experiencealula.com. Hegra (ancient Nabataean city) requires a guided tour booking in advance.',
    website: 'https://www.experiencealula.com',
    hours: 'Sites open 8:00 AM – 5:00 PM; evening stargazing events from 7:00 PM',
    gettingThere: 'Fly direct to Prince Abdul Majeed bin Abdulaziz Airport (ULH) from Riyadh, Jeddah, or Madinah. Ground transfers and resort shuttles available through Experience AlUla.',
    mapQuery: 'AlUla+Saudi+Arabia',
  },
  {
    id: 'e9',
    title: 'Saudi Cup Horse Racing',
    category: 'Sports',
    startDate: '2026-02-28',
    endDate: '2026-02-28',
    location: 'King Abdulaziz Racecourse',
    city: 'Riyadh',
    description: 'The world\'s richest horse race with a $20 million prize, attracting the finest thoroughbreds and jockeys from around the globe',
    image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=800&q=80',
    color: '#d97706',
    price: 'Free general admission; VIP from SAR 500',
    isFree: false,
    admission: 'General grandstand admission is free. VIP and hospitality packages available at saudicup.com. Dress code applies for VIP enclosures.',
    website: 'https://saudicup.com',
    hours: 'Gates open 12:00 PM; main race around 7:00 PM',
    gettingThere: 'King Abdulaziz Racecourse is in northeastern Riyadh. Free shuttle buses from King Fahd Stadium and select hotels on race day. Limited parking on-site.',
    mapQuery: 'King+Abdulaziz+Racecourse+Riyadh',
  },
  {
    id: 'e10',
    title: 'Founding Day Celebrations',
    category: 'National',
    startDate: '2026-02-22',
    endDate: '2026-02-22',
    location: 'Nationwide',
    city: 'All cities',
    description: 'Commemorating the founding of the First Saudi State in 1727 with nationwide cultural events, heritage displays, and fireworks',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
    color: '#10b981',
    price: 'Free',
    isFree: true,
    admission: 'All public Founding Day events are free. Heritage museums offer free entry on this day. No registration required for public celebrations.',
    website: 'https://www.visitsaudi.com',
    hours: 'Events throughout the day; main fireworks at 9:00 PM',
    gettingThere: 'Events held at major public squares, heritage sites, and corniche areas in all cities. Check local municipality announcements for exact locations.',
    mapQuery: 'Diriyah+Heritage+Site+Riyadh',
  },
  {
    id: 'e11',
    title: 'Red Sea International Film Festival',
    category: 'Culture',
    startDate: '2026-11-07',
    endDate: '2026-11-16',
    location: 'Various venues, Jeddah',
    city: 'Jeddah',
    description: 'Celebrating Arab and international cinema with screenings, masterclasses, and red carpet premieres by the Red Sea',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
    color: '#ec4899',
    price: 'Single screening from SAR 50; full festival pass SAR 600',
    isFree: false,
    admission: 'Book tickets at rsiff.com. Industry accreditation available for filmmakers. Red carpet premieres require separate invitations.',
    website: 'https://rsiff.com',
    hours: 'Screenings from 10:00 AM; evening galas from 7:00 PM',
    gettingThere: 'Screenings held across Jeddah including Park Place Mall and Al-Balad. Festival shuttle connects main venues. Ride-share recommended in evenings.',
    mapQuery: 'Red+Sea+Film+Festival+Jeddah',
  },
  {
    id: 'e12',
    title: 'GITEX Global – Riyadh',
    category: 'Business & Tech',
    startDate: '2026-04-13',
    endDate: '2026-04-17',
    location: 'Riyadh Exhibition & Convention Center',
    city: 'Riyadh',
    description: 'Middle East\'s largest tech and startup show featuring AI, cybersecurity, cloud computing, and digital transformation innovations',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
    color: '#6366f1',
    price: 'From SAR 400 (early bird); SAR 700 at gate',
    isFree: false,
    admission: 'Register at gitex.com. Multi-day passes and group discounts available. Startup exhibitor spots bookable separately.',
    website: 'https://www.gitex.com',
    hours: '10:00 AM – 7:00 PM',
    gettingThere: 'Riyadh Exhibition & Convention Center (RECC) is north of the city on King Salman Road. Metro Line 5 to RECC station. Free shuttle from Riyadh Park Mall.',
    mapQuery: 'Riyadh+Exhibition+Convention+Center',
  },
  {
    id: 'e13',
    title: 'Taif Rose Festival',
    category: 'Culture',
    startDate: '2026-03-20',
    endDate: '2026-04-10',
    location: 'Taif',
    city: 'Taif',
    description: 'Annual celebration of the famous Taif roses with flower picking tours, rose water distilleries, and traditional markets',
    image: 'https://images.unsplash.com/photo-1490750967868-88df5691cc2c?w=800&q=80',
    color: '#f43f5e',
    price: 'Free; rose farm tours from SAR 30',
    isFree: false,
    admission: 'Festival grounds are free to enter. Rose farm picking experiences and distillery tours sold on-site. Traditional souq open daily with no entry fee.',
    website: 'https://www.visitsaudi.com/taif',
    hours: '8:00 AM – 10:00 PM',
    gettingThere: 'Taif is 1.5 hours from Jeddah and 2 hours from Makkah. Fly to Taif Regional Airport (TIF). The rose farms are in the Al-Hada and Al-Shafa areas — local taxis or rental cars recommended.',
    mapQuery: 'Taif+Rose+Festival+Saudi+Arabia',
  },
  {
    id: 'e14',
    title: 'Hail International Rally',
    category: 'Sports',
    startDate: '2026-04-24',
    endDate: '2026-04-26',
    location: 'Hail Desert',
    city: 'Hail',
    description: 'High-octane desert rally racing through the dramatic volcanic landscape of the Hail region, part of the FIA Cross-Country series',
    image: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&q=80',
    color: '#ef4444',
    price: 'Free spectator access at designated viewing points',
    isFree: true,
    admission: 'Spectator access to service park and start/finish areas is free. Official grandstand seating sold through hailrally.com. Camping areas near the route available.',
    website: 'https://hailrally.com',
    hours: 'Stages run 7:00 AM – 5:00 PM; ceremonial start 6:00 PM on Day 1',
    gettingThere: 'Fly to Hail Regional Airport (HAS) from Riyadh or Jeddah. Rally HQ is at Hail Exhibition Center. 4×4 vehicles recommended for reaching remote stage viewing spots.',
    mapQuery: 'Hail+Saudi+Arabia',
  },
  {
    id: 'e15',
    title: 'Future Investment Initiative (FII)',
    category: 'Business & Tech',
    startDate: '2026-10-27',
    endDate: '2026-10-29',
    location: 'King Abdulaziz Conference Center',
    city: 'Riyadh',
    description: 'The "Davos of the Desert" — a global summit bringing together world leaders, investors, and innovators to shape the future economy',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80',
    color: '#0f172a',
    price: 'By invitation / accreditation only',
    isFree: false,
    admission: 'FII is an invite-only and accredited professional event. Apply for media or delegate accreditation at fii.org. Public livestreams available online.',
    website: 'https://fii.org',
    hours: '8:00 AM – 7:00 PM',
    gettingThere: 'King Abdulaziz Conference Center, central Riyadh. Official transport coordinated for registered delegates. Metro Line 3 (Al Woroud station) nearby.',
    mapQuery: 'King+Abdulaziz+Conference+Center+Riyadh',
  },
  {
    id: 'e16',
    title: 'Al-Jenadriyah Cultural Festival',
    category: 'Culture',
    startDate: '2026-03-05',
    endDate: '2026-03-20',
    location: 'Al-Jenadriyah, Riyadh',
    city: 'Riyadh',
    description: 'Saudi Arabia\'s largest heritage and cultural festival showcasing traditional crafts, folklore dances, poetry, and regional cuisine',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
    color: '#f59e0b',
    price: 'Free (men\'s days) / Women & family days SAR 20',
    isFree: false,
    admission: 'Entry fees apply on certain days. Tickets at the gate or via the National Guard website. Heritage village and crafts exhibitions are always free.',
    website: 'https://www.visitsaudi.com',
    hours: '4:00 PM – 11:00 PM (weekdays) / 2:00 PM – 12:00 AM (weekends)',
    gettingThere: 'Al-Jenadriyah is 45 km northeast of Riyadh center. Shuttle buses run from Granada Mall and other collection points. Ample free parking on-site.',
    mapQuery: 'Al+Jenadriyah+Heritage+Village+Riyadh',
  },
];

const CATEGORIES = ['All', 'Business & Tech', 'Culture', 'Sports', 'National'];

// ── Date helpers ─────────────────────────────────────────────────────────────

const TODAY = new Date('2026-03-27');

const diffDays = (a: Date, b: Date) =>
  Math.ceil((b.getTime() - a.getTime()) / 86400000);

const getCountdown = (startDate: string, endDate: string): { label: string; color: string } => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (TODAY > end) {
    return { label: 'Past event', color: 'text-slate-400' };
  }
  if (TODAY >= start && TODAY <= end) {
    const daysLeft = diffDays(TODAY, end);
    return {
      label: daysLeft === 0 ? 'Ends today' : `Ongoing — ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      color: 'text-emerald-600',
    };
  }
  const daysUntil = diffDays(TODAY, start);
  return {
    label: `Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
    color: 'text-blue-600',
  };
};

const formatDateRange = (start: string, end: string): string => {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (start === end) return s.toLocaleDateString('en-US', { ...opts, year: 'numeric' });
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
};

// ── Event Detail Page ─────────────────────────────────────────────────────────

// SaudiEvent is defined and exported above

const EventDetailPage = ({
  event,
  onBack,
  onCreateWithEvent,
}: {
  event: SaudiEvent;
  onBack: () => void;
  onCreateWithEvent?: (title: string) => void;
}) => {
  const countdown = getCountdown(event.startDate, event.endDate);
  const isPast = countdown.label === 'Past event';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${event.mapQuery}`;

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Hero image with back button */}
      <div className="relative w-full h-72 sm:h-80">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80';
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-2 rounded-xl font-semibold text-sm shadow hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Category badge */}
        <span
          className="absolute top-4 right-4 px-3 py-1 text-xs font-bold text-white rounded-full shadow"
          style={{ backgroundColor: event.color }}
        >
          {event.category}
        </span>

        {/* Title on image */}
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="text-2xl font-extrabold text-white leading-tight drop-shadow">{event.title}</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-4 h-4 text-white/80 flex-shrink-0" />
            <span className="text-sm text-white/90">{event.location}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-5 max-w-2xl mx-auto space-y-5">

        {/* Countdown pill */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className={`text-sm font-bold ${countdown.color}`}>{countdown.label}</span>
        </div>

        {/* Info cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Date & Time */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Date & Time</span>
            </div>
            <p className="text-sm text-slate-800 font-semibold">{formatDateRange(event.startDate, event.endDate)}</p>
            {event.hours && (
              <p className="text-xs text-slate-500 mt-1">{event.hours}</p>
            )}
          </div>

          {/* Admission / Price */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${event.isFree ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <DollarSign className={`w-4 h-4 ${event.isFree ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <span className="text-sm font-bold text-slate-700">Price</span>
            </div>
            <p className={`text-sm font-bold ${event.isFree ? 'text-emerald-600' : 'text-slate-800'}`}>{event.price}</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">About</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
        </div>

        {/* How to get in */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-slate-700">How to Get In</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{event.admission}</p>
          {event.website && (
            <a
              href={event.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <Globe className="w-4 h-4" />
              {event.website.replace('https://', '')}
            </a>
          )}
        </div>

        {/* Getting there */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <Navigation className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-bold text-slate-700">Getting There</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{event.gettingThere}</p>

          {/* Map link */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:border-emerald-400 hover:bg-emerald-50 transition-colors w-full"
          >
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-700">Open in Google Maps</span>
          </a>
        </div>

        {/* CTA */}
        {!isPast && (
          <button
            onClick={() => onCreateWithEvent?.(event.title)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors shadow-md text-sm"
          >
            Plan a Trip Around This Event
          </button>
        )}
      </div>
    </div>
  );
};

// ── Events List ───────────────────────────────────────────────────────────────

export const EventsScreen = ({
  onCreateWithEvent,
  initialEventId,
  onEventOpened,
}: {
  onCreateWithEvent?: (eventTitle: string) => void;
  initialEventId?: string;
  onEventOpened?: () => void;
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedEvent, setSelectedEvent] = useState<SaudiEvent | null>(null);

  // Auto-open a specific event when navigated from home
  useEffect(() => {
    if (initialEventId) {
      const event = getAllEvents().find(e => e.id === initialEventId) ?? null;
      if (event) {
        setSelectedEvent(event);
        onEventOpened?.();
      }
    }
  }, [initialEventId]);

  const allEvents = getAllEvents();
  const filtered = activeCategory === 'All'
    ? allEvents
    : allEvents.filter(e => e.category === activeCategory);

  if (selectedEvent) {
    return (
      <EventDetailPage
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onCreateWithEvent={onCreateWithEvent}
      />
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Events &amp; Experiences</h1>
          <p className="text-sm text-slate-500">Upcoming events &amp; festivals across Saudi Arabia</p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="px-6 py-4 border-b border-slate-50 overflow-x-auto">
        <div className="flex gap-2 max-w-3xl mx-auto">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                activeCategory === cat
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div className="px-6 py-6 space-y-6 max-w-3xl mx-auto">
        {filtered.map(event => {
          const countdown = getCountdown(event.startDate, event.endDate);
          const isPast = countdown.label === 'Past event';

          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-shadow hover:shadow-md cursor-pointer ${isPast ? 'opacity-60' : ''}`}
            >
              {/* Image */}
              <div className="relative w-full h-52">
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80';
                  }}
                />
                <span
                  className="absolute top-3 left-3 px-3 py-1 text-xs font-bold text-white rounded-full shadow"
                  style={{ backgroundColor: event.color }}
                >
                  {event.category}
                </span>
                {/* Price badge */}
                <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full shadow ${event.isFree ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-700'}`}>
                  {event.isFree ? 'Free' : event.price.split(';')[0]}
                </span>
              </div>

              {/* Content */}
              <div className="p-5">
                <h2 className="text-lg font-extrabold text-slate-900 mb-1">{event.title}</h2>

                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDateRange(event.startDate, event.endDate)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{event.location}</span>
                </div>

                <p className="text-sm text-slate-600 mb-4 leading-relaxed line-clamp-2">{event.description}</p>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className={`text-sm font-bold ${countdown.color}`}>{countdown.label}</span>
                  </div>

                  <span className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 px-3 py-1 rounded-full">
                    Tap for details →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
