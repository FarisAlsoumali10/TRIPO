import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Calendar, Clock, ArrowLeft, Ticket, Globe, DollarSign, Info, Navigation, Search, X, Bookmark, Share2, CalendarPlus, Heart, Flame, Users } from 'lucide-react';
import { FeaturedSlideshow, SlideItem } from '../components/FeaturedSlideshow';
import { showToast } from '../components/Toast';

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
const CITIES = ['All', ...Array.from(new Set(
  SAUDI_EVENTS.map(e => e.city).filter(c => c !== 'All cities')
))];

type TimeFilter = 'all' | 'ongoing' | 'upcoming' | 'this_week' | 'this_month' | 'past';

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'ongoing', label: '● Ongoing' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'past', label: 'Past' },
];

// ── Date / status helpers ─────────────────────────────────────────────────────

const diffDays = (a: Date, b: Date) =>
  Math.ceil((b.getTime() - a.getTime()) / 86400000);

function isOngoing(e: SaudiEvent): boolean {
  const now = new Date();
  return new Date(e.startDate) <= now && now <= new Date(e.endDate);
}

function isPastEvent(e: SaudiEvent): boolean {
  return new Date(e.endDate) < new Date();
}

function isThisWeek(e: SaudiEvent): boolean {
  const now = new Date();
  const start = new Date(e.startDate);
  const weekOut = new Date(now.getTime() + 7 * 86400000);
  return start <= weekOut && !isPastEvent(e);
}

function isThisMonth(e: SaudiEvent): boolean {
  const now = new Date();
  const start = new Date(e.startDate);
  const monthOut = new Date(now.getTime() + 30 * 86400000);
  return start <= monthOut && !isPastEvent(e);
}

function getDurationLabel(startDate: string, endDate: string): string {
  const days = diffDays(new Date(startDate), new Date(endDate)) + 1;
  if (days === 1) return '1-day event';
  return `${days}-day event`;
}

const getCountdown = (startDate: string, endDate: string): { label: string; color: string; urgent: boolean } => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now > end) return { label: 'Past event', color: 'text-slate-400', urgent: false };
  if (now >= start && now <= end) {
    const daysLeft = diffDays(now, end);
    return {
      label: daysLeft === 0 ? 'Ends today' : `Ongoing — ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      color: 'text-emerald-600',
      urgent: daysLeft <= 2,
    };
  }
  const daysUntil = diffDays(now, start);
  return {
    label: `Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
    color: daysUntil <= 7 ? 'text-orange-600' : 'text-blue-600',
    urgent: daysUntil <= 3,
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

function toGoogleCalendarUrl(event: SaudiEvent): string {
  const start = event.startDate.replace(/-/g, '');
  // endDate in Google Calendar is exclusive, add 1 day
  const endDt = new Date(event.endDate);
  endDt.setDate(endDt.getDate() + 1);
  const end = endDt.toISOString().slice(0, 10).replace(/-/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
    location: event.location,
  });
  return `https://www.google.com/calendar/render?${params}`;
}

// ── Event Detail Page ─────────────────────────────────────────────────────────

const EventDetailPage = ({
  event,
  onBack,
  onCreateWithEvent,
  lang,
  allEvents,
  onSelectEvent,
}: {
  event: SaudiEvent;
  onBack: () => void;
  onCreateWithEvent?: (title: string) => void;
  lang?: string;
  allEvents?: SaudiEvent[];
  onSelectEvent?: (e: SaudiEvent) => void;
}) => {
  const countdown = getCountdown(event.startDate, event.endDate);
  const isPast = countdown.label === 'Past event';
  const ongoing = isOngoing(event);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${event.mapQuery}`;
  const durationLabel = getDurationLabel(event.startDate, event.endDate);
  const daysUntil = !isPast && !ongoing ? diffDays(new Date(), new Date(event.startDate)) : null;

  // Bookmark
  const [saved, setSaved] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('tripo_saved_events') || '[]') as string[]).includes(event.id); } catch { return false; }
  });
  const toggleSaved = () => {
    try {
      const list: string[] = JSON.parse(localStorage.getItem('tripo_saved_events') || '[]');
      const updated = saved ? list.filter(id => id !== event.id) : [...list, event.id];
      localStorage.setItem('tripo_saved_events', JSON.stringify(updated));
      setSaved(!saved);
      showToast(saved ? 'Removed from saved' : 'Event saved!', 'success');
    } catch {}
  };

  // Interest counter
  const [interested, setInterested] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('tripo_my_event_interests') || '[]') as string[]).includes(event.id); } catch { return false; }
  });
  const [interestCount, setInterestCount] = useState(() => {
    try {
      const counts: Record<string, number> = JSON.parse(localStorage.getItem('tripo_event_interests') || '{}');
      // seed with a base count so it doesn't start at 0/1
      const base: Record<string, number> = { e1: 412, e3: 289, e4: 1850, e5: 167, e6: 324, e9: 538, e10: 2100, e11: 196, e12: 301, e13: 88, e14: 143, e15: 447, e16: 612 };
      return (counts[event.id] ?? 0) + (base[event.id] ?? 50);
    } catch { return 50; }
  });
  const toggleInterest = () => {
    try {
      const myList: string[] = JSON.parse(localStorage.getItem('tripo_my_event_interests') || '[]');
      const counts: Record<string, number> = JSON.parse(localStorage.getItem('tripo_event_interests') || '{}');
      const delta = interested ? -1 : 1;
      const updated = interested ? myList.filter(id => id !== event.id) : [...myList, event.id];
      const updatedCounts = { ...counts, [event.id]: Math.max(0, (counts[event.id] ?? 0) + delta) };
      localStorage.setItem('tripo_my_event_interests', JSON.stringify(updated));
      localStorage.setItem('tripo_event_interests', JSON.stringify(updatedCounts));
      setInterested(!interested);
      setInterestCount(c => c + delta);
      showToast(interested ? 'Removed interest' : "Added to your interests!", 'success');
    } catch {}
  };

  // Share
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: `${event.title} — ${event.location}` }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(window.location.href); showToast('Link copied!', 'success'); } catch {}
  };

  // Related events (same category or same city, excluding current)
  const relatedEvents = useMemo(() => {
    if (!allEvents) return [];
    return allEvents
      .filter(e => e.id !== event.id && !isPastEvent(e) && (e.category === event.category || e.city === event.city))
      .slice(0, 5);
  }, [allEvents, event.id]);

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Hero */}
      <div className="relative w-full h-72 sm:h-80">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-800 px-3 py-2 rounded-xl font-semibold text-sm shadow hover:bg-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Top-right action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={handleShare}
            className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow hover:bg-white transition-colors">
            <Share2 className="w-4 h-4 text-slate-700" />
          </button>
          <button onClick={toggleSaved}
            className={`w-9 h-9 backdrop-blur-sm rounded-xl flex items-center justify-center shadow transition-colors ${saved ? 'bg-rose-500' : 'bg-white/90 hover:bg-white'}`}>
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-white text-white' : 'text-slate-700'}`} />
          </button>
        </div>

        {/* Category + duration badges */}
        <div className="absolute bottom-16 left-5 flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 text-xs font-bold text-white rounded-full shadow" style={{ backgroundColor: event.color }}>
            {event.category}
          </span>
          <span className="px-3 py-1 text-xs font-bold text-white bg-black/50 backdrop-blur-sm rounded-full">
            {durationLabel}
          </span>
          {ongoing && (
            <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-emerald-500/90 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Happening Now
            </span>
          )}
        </div>

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

        {/* Countdown + Interest bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {countdown.urgent && !isPast ? (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${ongoing ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                <Flame className="w-4 h-4" />
                {countdown.label}
              </div>
            ) : (
              <>
                <Clock className="w-4 h-4 text-slate-400" />
                <span className={`text-sm font-bold ${countdown.color}`}>{countdown.label}</span>
              </>
            )}
          </div>

          {/* Interest counter */}
          <button onClick={!isPast ? toggleInterest : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
              interested
                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                : isPast
                  ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-default'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-500'
            }`}>
            <Heart className={`w-4 h-4 ${interested ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{interestCount.toLocaleString()} interested</span>
          </button>
        </div>

        {/* Imminent countdown box */}
        {!isPast && !ongoing && daysUntil !== null && daysUntil <= 14 && (
          <div className={`rounded-2xl p-4 text-center border ${daysUntil <= 3 ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${daysUntil <= 3 ? 'text-orange-500' : 'text-blue-500'}`}>
              {daysUntil <= 3 ? '🔥 Almost here!' : '📅 Coming up'}
            </p>
            <p className={`text-4xl font-black ${daysUntil <= 3 ? 'text-orange-600' : 'text-blue-600'}`}>{daysUntil}</p>
            <p className={`text-sm font-semibold mt-0.5 ${daysUntil <= 3 ? 'text-orange-500' : 'text-blue-500'}`}>
              day{daysUntil !== 1 ? 's' : ''} away
            </p>
          </div>
        )}

        {/* Info cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date & Time */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-slate-700">Date &amp; Time</span>
            </div>
            <p className="text-sm text-slate-800 font-semibold">{formatDateRange(event.startDate, event.endDate)}</p>
            {event.hours && <p className="text-xs text-slate-500 mt-1">{event.hours}</p>}
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

        {/* About */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">About</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
        </div>

        {/* How to Get In */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-bold text-slate-700">How to Get In</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{event.admission}</p>
          {event.website && (
            <a href={event.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700">
              <Globe className="w-4 h-4" />
              {event.website.replace('https://', '')}
            </a>
          )}
        </div>

        {/* Add to Calendar */}
        {!isPast && (
          <a
            href={toGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CalendarPlus className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-800">Add to Calendar</p>
              <p className="text-xs text-slate-500">Opens Google Calendar</p>
            </div>
            <span className="text-xs text-emerald-600 font-semibold">→</span>
          </a>
        )}

        {/* Getting There */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <Navigation className="w-4 h-4 text-slate-600" />
            </div>
            <span className="text-sm font-bold text-slate-700">Getting There</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{event.gettingThere}</p>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 hover:border-emerald-400 hover:bg-emerald-50 transition-colors w-full">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-700">Open in Google Maps</span>
          </a>
        </div>

        {/* Related events */}
        {relatedEvents.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3">You Might Also Like</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              {relatedEvents.map(rel => {
                const rc = getCountdown(rel.startDate, rel.endDate);
                return (
                  <button key={rel.id} onClick={() => onSelectEvent?.(rel)}
                    className="flex-shrink-0 w-44 text-left rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
                    <div className="h-24 relative overflow-hidden bg-slate-200">
                      <img src={rel.image} alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} loading="lazy" />
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[9px] font-bold text-white rounded-full"
                        style={{ backgroundColor: rel.color }}>{rel.category}</span>
                    </div>
                    <div className="p-2.5">
                      <p className="font-bold text-[11px] text-slate-900 line-clamp-2 leading-tight">{rel.title}</p>
                      <p className={`text-[10px] font-semibold mt-1 ${rc.color}`}>{rc.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        {!isPast && (
          <button
            onClick={() => onCreateWithEvent?.(event.title)}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-colors shadow-md text-sm"
          >
            {lang === 'ar' ? 'خطط رحلة حول هذه الفعالية' : 'Plan a Trip Around This Event'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Events List ───────────────────────────────────────────────────────────────

export const EventsScreen = ({
  t,
  lang,
  onCreateWithEvent,
  initialEventId,
  onEventOpened,
}: {
  t?: any;
  lang?: string;
  onCreateWithEvent?: (eventTitle: string) => void;
  initialEventId?: string;
  onEventOpened?: () => void;
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [search, setSearch] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SaudiEvent | null>(null);

  // Saved events (for count badge in header)
  const [savedCount, setSavedCount] = useState(() => {
    try { return (JSON.parse(localStorage.getItem('tripo_saved_events') || '[]') as string[]).length; } catch { return 0; }
  });

  // Saved cards (bookmark on list cards)
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem('tripo_saved_events') || '[]') as string[]); } catch { return new Set<string>(); }
  });

  const toggleSavedCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const list: string[] = JSON.parse(localStorage.getItem('tripo_saved_events') || '[]');
      const wasSaved = savedIds.has(id);
      const updated = wasSaved ? list.filter(x => x !== id) : [...list, id];
      localStorage.setItem('tripo_saved_events', JSON.stringify(updated));
      const newSet = new Set<string>(updated);
      setSavedIds(newSet);
      setSavedCount(newSet.size);
      showToast(wasSaved ? 'Removed from saved' : 'Event saved!', 'success');
    } catch {}
  };

  // Re-sync saved state when detail closes
  useEffect(() => {
    if (!selectedEvent) {
      try {
        const list = JSON.parse(localStorage.getItem('tripo_saved_events') || '[]') as string[];
        setSavedIds(new Set<string>(list));
        setSavedCount(list.length);
      } catch {}
    }
  }, [selectedEvent]);

  // Auto-open a specific event when navigated from home
  useEffect(() => {
    if (initialEventId) {
      const event = getAllEvents().find(e => e.id === initialEventId) ?? null;
      if (event) { setSelectedEvent(event); onEventOpened?.(); }
    }
  }, [initialEventId]);

  const allEvents = getAllEvents();

  // Happening Now
  const happeningNow = useMemo(() =>
    allEvents.filter(e => isOngoing(e)),
  [allEvents]);

  // Filtered list
  const filtered = useMemo(() => {
    let result = allEvents;
    if (activeCategory !== 'All') result = result.filter(e => e.category === activeCategory);
    if (cityFilter !== 'All') result = result.filter(e => e.city === cityFilter || e.city === 'All cities');
    if (freeOnly) result = result.filter(e => e.isFree);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    if (timeFilter === 'ongoing') result = result.filter(e => isOngoing(e));
    else if (timeFilter === 'upcoming') result = result.filter(e => !isPastEvent(e) && !isOngoing(e));
    else if (timeFilter === 'this_week') result = result.filter(e => isThisWeek(e));
    else if (timeFilter === 'this_month') result = result.filter(e => isThisMonth(e));
    else if (timeFilter === 'past') result = result.filter(e => isPastEvent(e));
    return result;
  }, [allEvents, activeCategory, cityFilter, freeOnly, search, timeFilter]);

  const isFiltering = !!(search || activeCategory !== 'All' || cityFilter !== 'All' || freeOnly || timeFilter !== 'all');

  if (selectedEvent) {
    return (
      <EventDetailPage
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onCreateWithEvent={onCreateWithEvent}
        lang={lang}
        allEvents={allEvents}
        onSelectEvent={setSelectedEvent}
      />
    );
  }

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100">
        <div className="px-5 pt-5 pb-3 max-w-3xl mx-auto">
          {/* Title row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                {t?.tabEventsLabel || 'Events'} &amp; {lang === 'ar' ? 'تجارب' : 'Experiences'}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {isFiltering
                  ? `${filtered.length} event${filtered.length !== 1 ? 's' : ''} found`
                  : `${allEvents.length} events across Saudi Arabia`}
              </p>
            </div>
            {savedCount > 0 && (
              <div className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-1.5 rounded-xl text-xs font-bold flex-shrink-0">
                <Bookmark className="w-3.5 h-3.5 fill-rose-500" />
                {savedCount} saved
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events, cities, or categories…"
              className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter pills */}
          <div className="relative mb-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeCategory === cat
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                  }`}>
                  {cat === 'All' ? (t?.catAll || 'All') : cat}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
          </div>

          {/* City filter pills */}
          <div className="relative mb-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {CITIES.map(city => (
                <button key={city} onClick={() => setCityFilter(city)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                    cityFilter === city
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-teal-400 hover:text-teal-600'
                  }`}>
                  {city !== 'All' && <MapPin className="w-2.5 h-2.5" />}
                  {city}
                </button>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
          </div>

          {/* Time filter + Free toggle row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {TIME_FILTERS.map(tf => (
              <button key={tf.id} onClick={() => setTimeFilter(tf.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  timeFilter === tf.id
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-600'
                }`}>
                {tf.label}
              </button>
            ))}
            <div className="w-px h-4 bg-slate-200 flex-shrink-0" />
            <button onClick={() => setFreeOnly(v => !v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                freeOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
              }`}>
              🆓 Free only
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Happening Now strip */}
        {happeningNow.length > 0 && timeFilter === 'all' && !search && (
          <div className="px-5 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <h2 className="text-sm font-bold text-slate-800">Happening Now</h2>
              <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{happeningNow.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
              {happeningNow.map(event => {
                const rc = getCountdown(event.startDate, event.endDate);
                return (
                  <button key={event.id} onClick={() => setSelectedEvent(event)}
                    className="flex-shrink-0 w-52 text-left rounded-2xl overflow-hidden border-2 border-emerald-300 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group relative">
                    <div className="h-28 relative overflow-hidden bg-slate-200">
                      <img src={event.image} alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} loading="lazy" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        LIVE
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-slate-900 line-clamp-1">{event.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />{event.city}
                      </p>
                      <p className={`text-xs font-semibold mt-1 ${rc.color}`}>{rc.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Featured Slideshow */}
        {(() => {
          const now = new Date();
          const upcomingItems: SlideItem[] = allEvents
            .filter(e => new Date(e.endDate) >= now && e.image)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 8)
            .map(e => ({
              id: e.id,
              type: 'event' as const,
              name: e.title,
              image: e.image,
              subtitle: `${e.city} · ${new Date(e.startDate).toLocaleDateString('en-SA', { day: 'numeric', month: 'short' })}`,
              badge: e.category,
              badgeColor: e.color || '#0d9488',
            }));
          if (!upcomingItems.length || isFiltering) return null;
          return (
            <div className="mt-2 mb-2">
              <FeaturedSlideshow
                items={upcomingItems}
                onPress={item => {
                  const found = allEvents.find(e => e.id === item.id) ?? null;
                  if (found) setSelectedEvent(found);
                }}
                height="h-72"
              />
            </div>
          );
        })()}

        {/* Reset filters bar */}
        {isFiltering && (
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              {filtered.length === 0 ? 'No events found' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}
              {search && <span> for "<span className="text-slate-700 font-semibold">{search}</span>"</span>}
            </p>
            <button onClick={() => { setSearch(''); setActiveCategory('All'); setCityFilter('All'); setTimeFilter('all'); setFreeOnly(false); }}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
              Clear all
            </button>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-5">
            <Calendar className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-500 text-sm">No events found</p>
            <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or search term</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All'); setCityFilter('All'); setTimeFilter('all'); setFreeOnly(false); }}
              className="mt-4 px-5 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold hover:bg-emerald-700 transition">
              Reset filters
            </button>
          </div>
        )}

        {/* Events list */}
        <div className="px-5 py-4 space-y-5">
          {filtered.map(event => {
            const countdown = getCountdown(event.startDate, event.endDate);
            const isPast = countdown.label === 'Past event';
            const ongoing = isOngoing(event);
            const isSaved = savedIds.has(event.id);

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={`rounded-2xl overflow-hidden border border-slate-100 shadow-sm transition-all hover:shadow-md cursor-pointer ${isPast ? 'opacity-60' : ''} ${ongoing ? 'ring-2 ring-emerald-300' : ''}`}
              >
                {/* Image */}
                <div className="relative w-full h-52">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80'; }}
                    loading="lazy"
                  />

                  {/* Category badge */}
                  <span className="absolute top-3 left-3 px-3 py-1 text-xs font-bold text-white rounded-full shadow"
                    style={{ backgroundColor: event.color }}>
                    {event.category}
                  </span>

                  {/* Ongoing pill */}
                  {ongoing && (
                    <span className="absolute top-3 left-3 mt-7 flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold text-white bg-emerald-500/90 rounded-full">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      Happening Now
                    </span>
                  )}

                  {/* Price badge */}
                  <span className={`absolute top-3 right-12 px-3 py-1 text-xs font-bold rounded-full shadow ${event.isFree ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-700'}`}>
                    {event.isFree ? (t?.eventsFree || 'Free') : event.price.split(';')[0]}
                  </span>

                  {/* Bookmark button */}
                  <button
                    onClick={e => toggleSavedCard(event.id, e)}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow transition-all ${isSaved ? 'bg-rose-500' : 'bg-white/90 hover:bg-white'}`}>
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white text-white' : 'text-slate-600'}`} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 bg-white">
                  <h2 className="text-lg font-extrabold text-slate-900 mb-1">{event.title}</h2>

                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{formatDateRange(event.startDate, event.endDate)}</span>
                    <span className="text-slate-300 mx-1">·</span>
                    <span className="text-xs text-slate-400">{getDurationLabel(event.startDate, event.endDate)}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{event.location}</span>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 leading-relaxed line-clamp-2">{event.description}</p>

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {countdown.urgent && !isPast
                        ? <Flame className="w-4 h-4 text-orange-500" />
                        : <Clock className="w-4 h-4 text-slate-400" />}
                      <span className={`text-sm font-bold ${countdown.color}`}>{countdown.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Interest count (mini) */}
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        {((): number => {
                          const base: Record<string, number> = { e1: 412, e3: 289, e4: 1850, e5: 167, e6: 324, e9: 538, e10: 2100, e11: 196, e12: 301, e13: 88, e14: 143, e15: 447, e16: 612 };
                          try {
                            const counts: Record<string, number> = JSON.parse(localStorage.getItem('tripo_event_interests') || '{}');
                            return (counts[event.id] ?? 0) + (base[event.id] ?? 50);
                          } catch { return base[event.id] ?? 50; }
                        })().toLocaleString()} interested
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 px-3 py-1 rounded-full">
                        Details →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
