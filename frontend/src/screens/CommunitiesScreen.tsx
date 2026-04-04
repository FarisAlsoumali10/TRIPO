import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, ChevronRight, Trophy, Star, MessageSquare, Plus, Crown, Flame, CheckCircle2, Send, X, ShieldCheck, Heart, Calendar, Clock, MapPin, Wallet as WalletIcon, TrendingUp, Award, Search, Tag, ArrowLeft, Hash, MessageCircle, Handshake, UserPlus, Bell, Globe, ExternalLink, Info, Image } from 'lucide-react';
import { Community, Itinerary, FazaRequest, ChatMessage, CommunityEvent, User, Place, MajlisThread } from '../types/index';

// ── Feature 10 helpers ──────────────────────────────────────────────────────
function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
}
function urlDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

// ── Feature 11: Community About/Rules data ────────────────────────────────
const COMMUNITY_ABOUT: Record<string, { about: string; rules: string[] }> = {
  default: {
    about: 'مجتمع تريبو هو مكان للتواصل مع المسافرين وعشاق الاستكشاف في المملكة العربية السعودية.',
    rules: ['احترام الجميع وتجنب الكلام الجارح', 'لا إعلانات تجارية بدون إذن المشرف', 'المحتوى باللغتين العربية والإنجليزية مقبول', 'شارك تجاربك الحقيقية فقط', 'أبلغ عن أي محتوى مسيء للمشرفين']
  }
};

// ── Extended Event type (local, backward-compatible) ──────────────────────────
interface ExtendedCommunityEvent extends CommunityEvent {
  endTime?: string;
  mapUrl?: string;
  category?: string;
  coverPreset?: number;
  maxAttendees?: number;
  minAttendees?: number;
  recurrence?: 'once' | 'weekly' | 'monthly';
  isFree?: boolean;
  fee?: number;
  requirements?: string[];
  organizerNote?: string;
  status?: 'draft' | 'published';
}

const EVENT_CATEGORIES = [
  { id: 'sports',   label: 'رياضة',    emoji: '⚽' },
  { id: 'food',     label: 'أكل وشرب', emoji: '🍽️' },
  { id: 'hiking',   label: 'رحلات',    emoji: '🏔️' },
  { id: 'cultural', label: 'ثقافي',    emoji: '🎭' },
  { id: 'social',   label: 'تجمع',     emoji: '👥' },
  { id: 'gaming',   label: 'ألعاب',    emoji: '🎮' },
  { id: 'art',      label: 'فن',       emoji: '🎨' },
  { id: 'other',    label: 'أخرى',     emoji: '✨' },
] as const;

const COVER_PRESETS = [
  { bg: 'linear-gradient(135deg,#6366f1,#9333ea)', emoji: '🗓️' },
  { bg: 'linear-gradient(135deg,#10b981,#0d9488)', emoji: '🌿' },
  { bg: 'linear-gradient(135deg,#f97316,#ef4444)', emoji: '🔥' },
  { bg: 'linear-gradient(135deg,#0ea5e9,#2563eb)', emoji: '⭐' },
  { bg: 'linear-gradient(135deg,#ec4899,#f43f5e)', emoji: '💫' },
  { bg: 'linear-gradient(135deg,#f59e0b,#eab308)', emoji: '✨' },
];

const RECURRENCE_OPTS = [
  { id: 'once',    label: 'مرة واحدة' },
  { id: 'weekly',  label: 'أسبوعياً'  },
  { id: 'monthly', label: 'شهرياً'    },
] as const;

// ── Faza Request creation constants ──────────────────────────────────────────
const FAZA_CATEGORIES = [
  { id: 'recommendation', label: 'توصية',   emoji: '📍', color: '#6366f1' },
  { id: 'advice',         label: 'نصيحة',   emoji: '💡', color: '#f59e0b' },
  { id: 'planning',       label: 'تخطيط',   emoji: '🗺️', color: '#10b981' },
  { id: 'emergency',      label: 'طارئ',    emoji: '🚨', color: '#ef4444' },
  { id: 'general',        label: 'استفسار', emoji: '💬', color: '#8b5cf6' },
  { id: 'transport',      label: 'مواصلات', emoji: '🚗', color: '#0ea5e9' },
  { id: 'food',           label: 'أكل',     emoji: '🍽️', color: '#f97316' },
  { id: 'gear',           label: 'معدات',   emoji: '🎒', color: '#64748b' },
] as const;

const FAZA_TEMPLATES = [
  'أوصوني بـ...',
  'أحتاج مساعدة في...',
  'وين أقدر أحصل...',
  'أحسن مكان لـ...',
  'كيف أروح لـ...',
  'ما أعرف وين...',
];

const FAZA_URGENCY = [
  { id: 'today',   label: 'اليوم',       emoji: '🔴', desc: 'أحتاج رد سريع' },
  { id: 'week',    label: 'هذا الأسبوع', emoji: '🟡', desc: 'ما في ضغط كبير' },
  { id: 'anytime', label: 'في أي وقت',   emoji: '🟢', desc: 'مو مستعجل' },
] as const;

import { Button, Input, Badge } from '../components/ui';
import { placeAPI, communityAPI } from '../services/api';

// ── Traveling Together types & constants ──────────────────────────────────────

interface TravelPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  placeName: string;
  placeId?: string;
  date: string; // ISO date
  groupSize: number;
  maxSize: number;
  description: string;
  interests: string[];
  timestamp: number;
  joinedByMe?: boolean;
}

const TRAVEL_POSTS_KEY = 'tripo_travel_posts';

const INTEREST_KEYS = [
  { val: 'Hiking', tKey: 'ttInterestHiking' },
  { val: 'Foodie', tKey: 'ttInterestFoodie' },
  { val: 'Art', tKey: 'ttInterestArt' },
  { val: 'History', tKey: 'ttInterestHistory' },
  { val: 'Photography', tKey: 'ttInterestPhoto' },
  { val: 'Adventure', tKey: 'ttInterestAdventure' },
  { val: 'Relaxation', tKey: 'ttInterestRelax' },
  { val: 'Culture', tKey: 'ttInterestCulture' },
];

const SEED_POSTS: TravelPost[] = [
  {
    id: 'seed-1',
    userId: 'user-ahmad',
    userName: 'Ahmad Al-Rashid',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ahmad',
    placeName: 'Al Bujairi Heritage Park',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    groupSize: 2,
    maxSize: 5,
    description: "Planning a chill afternoon at Al Bujairi, would love to meet fellow history enthusiasts!",
    interests: ['History', 'Photography'],
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'seed-2',
    userId: 'user-sara',
    userName: 'Sara Khalid',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sara',
    placeName: 'Kingdom Centre Tower',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    groupSize: 1,
    maxSize: 4,
    description: "Weekend visit to Kingdom Centre, looking for travel buddies. We can grab coffee afterwards!",
    interests: ['Photography', 'Foodie'],
    timestamp: Date.now() - 7200000,
  },
  {
    id: 'seed-3',
    userId: 'user-khalid',
    userName: 'Khalid Bin Turki',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=khalid',
    placeName: 'Edge of the World',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    groupSize: 3,
    maxSize: 8,
    description: "Epic hiking trip to Edge of the World (Jebel Fihrayn). Need adventurers! Bringing camping gear.",
    interests: ['Hiking', 'Adventure', 'Photography'],
    timestamp: Date.now() - 1800000,
  },
];

const COMMUNITY_CATEGORIES = ['الكل', 'Sports', 'Food', 'Nature', 'Cars'];

const getTravelPosts = (): TravelPost[] => {
  try {
    const raw = localStorage.getItem(TRAVEL_POSTS_KEY);
    if (!raw) {
      localStorage.setItem(TRAVEL_POSTS_KEY, JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    const posts: TravelPost[] = JSON.parse(raw);
    // Filter out past dates
    const today = new Date().toISOString().split('T')[0];
    return posts.filter(p => p.date >= today);
  } catch { return SEED_POSTS; }
};

export const MOCK_COMMUNITIES: Community[] = [
  { id: 'c13', name: '⚽ دوري الحواري', description: 'مباريات، تحديات، ونقاشات الدوري السعودي والعالمي.', icon: '⚽', category: 'Sports', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80', memberCount: 3420, activeTripsCount: 12 },
  { id: 'c14', name: '🍔 ذواقة الرياض', description: 'تجارب المطاعم، الفود ترك، وألذ الأطباق في المدينة.', icon: '🍔', category: 'Food', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', memberCount: 2875, activeTripsCount: 9 },
  { id: 'c15', name: '💪 أبطال اللياقة', description: 'تمارين، تغذية صحية، وتحديات اللياقة البدنية.', icon: '💪', category: 'Sports', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80', memberCount: 1980, activeTripsCount: 7 },
  { id: 'c16', name: '🎣 محترفي الصيد', description: 'أماكن الصيد، المعدات، وأفضل الأوقات للصيد.', icon: '🎣', category: 'Nature', image: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=800&q=80', memberCount: 1240, activeTripsCount: 5 },
  { id: 'c17', name: '🚤 عشاق البحر', description: 'قوارب، دبابات بحرية، وكل الأنشطة المائية.', icon: '🚤', category: 'Sports', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80', memberCount: 870, activeTripsCount: 4 },
  { id: 'c18', name: '🏎️ حلبة السرعة', description: 'كارتينج، دبابات برية، وسباقات السرعة.', icon: '🏎️', category: 'Cars', image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80', memberCount: 1560, activeTripsCount: 6 },
  { id: 'c19', name: '🏀 سلة المحترفين', description: 'تحديات كرة سلة، حجز ملاعب، ودوريات 3x3.', icon: '🏀', category: 'Sports', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80', memberCount: 2100, activeTripsCount: 11 },
  { id: 'c20', name: '🚴 دراجي الرياض', description: 'مسارات الدراجات، تجمعات صباحية، وسباقات الهواة.', icon: '🚴', category: 'Sports', image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80', memberCount: 1350, activeTripsCount: 8 },
  { id: 'c21', name: '🏍️ بايكرز', description: 'تجمعات الدراجات النارية، رايدات جماعية، وصيانة.', icon: '🏍️', category: 'Cars', image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80', memberCount: 990, activeTripsCount: 5 },
  { id: 'c22', name: '🏜️ تطعيس', description: 'تحدي الطعوس، تعديل سيارات البر، وكشتات التطعيس.', icon: '🏜️', category: 'Nature', image: 'https://images.unsplash.com/photo-1541423487523-c9569614b109?w=800&q=80', memberCount: 4210, activeTripsCount: 18 },
  { id: 'c23', name: '🥾 Riyadh Hikers', description: 'Trail runs, sunrise hikes, and weekend treks around Saudi Arabia\'s most scenic landscapes.', icon: '🥾', category: 'Nature', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80', memberCount: 1870, activeTripsCount: 14 },
];

// 🟢 مستخدم افتراضي آمن لتجنب انهيار الشاشة (يجب استبداله لاحقاً ببيانات authAPI)
const SAFE_DEFAULT_USER: User = {
  id: 'current-user',
  name: 'بطل تريبو',
  email: 'user@tripo.com',
  role: 'user',
  language: 'ar',
  karamPoints: 120,
  walletBalance: 50.0,
  fazaCount: 2,
  rank: 'مستكشف',
  smartProfile: { interests: [], preferredBudget: 'medium', activityStyles: [], typicalFreeTimeWindow: 0, city: 'الرياض' }
};

export const CommunitiesScreen = ({ t, lang, onOpenItinerary, initialCommunityId, onCommunityOpened }: { t: any, lang: string, onOpenItinerary: (it: Itinerary) => void, initialCommunityId?: string, onCommunityOpened?: () => void }) => {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(() => {
    if (!initialCommunityId) return null;
    return MOCK_COMMUNITIES.find(c => c.id === initialCommunityId) ?? null;
  });
  const [activeTab, setActiveTab] = useState<'majlis' | 'requests' | 'events' | 'about'>('majlis');

  // ── Traveling Together state ──────────────────────────────────────────────
  const [mainTab, setMainTab] = useState<'communities' | 'traveling'>('communities');
  const [travelPosts, setTravelPosts] = useState<TravelPost[]>(getTravelPosts);
  const [showPostTripModal, setShowPostTripModal] = useState(false);
  const [newTripPost, setNewTripPost] = useState({
    placeName: '',
    date: '',
    maxSize: 4,
    description: '',
    interests: [] as string[],
  });
  const [showFazaModal, setShowFazaModal] = useState<FazaRequest | null>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [fazaAnswer, setFazaAnswer] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [communities, setCommunities] = useState<Community[]>(MOCK_COMMUNITIES);
  const [localEvents, setLocalEvents] = useState<CommunityEvent[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_events') || '[]'); } catch { return []; }
  });
  const [localFazaRequests, setLocalFazaRequests] = useState<FazaRequest[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_faza') || '[]'); } catch { return []; }
  });
  const [joinedEvents, setJoinedEvents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_joined_events') || '[]'); } catch { return []; }
  });
  const [userProfile, setUserProfile] = useState<User>(SAFE_DEFAULT_USER);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── New feature state ─────────────────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [threadReactions, setThreadReactions] = useState<Record<string, Record<string, string[]>>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_thread_reactions') || '{}'); } catch { return {}; }
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    const lastVisit = parseInt(localStorage.getItem('tripo_communities_last_visit') || '0');
    let count = 0;
    try {
      const savedThreads: Record<string, MajlisThread[]> = JSON.parse(localStorage.getItem('tripo_threads') || '{}');
      Object.values(savedThreads).forEach(cThreads => {
        (cThreads as MajlisThread[]).forEach((th: MajlisThread) => {
          if (new Date(th.createdAt).getTime() > lastVisit) count++;
        });
      });
      const savedPosts: TravelPost[] = JSON.parse(localStorage.getItem(TRAVEL_POSTS_KEY) || '[]');
      savedPosts.forEach(p => { if (p.timestamp > lastVisit && p.userId !== 'current-user') count++; });
    } catch {}
    localStorage.setItem('tripo_communities_last_visit', Date.now().toString());
    return count;
  });
  const [chatDmPost, setChatDmPost] = useState<string | null>(null);
  const [dmInputs, setDmInputs] = useState<Record<string, string>>({});

  // Thread state
  const [threads, setThreads] = useState<Record<string, MajlisThread[]>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_threads') || '{}'); } catch { return {}; }
  });
  const [threadSearch, setThreadSearch] = useState('');
  const [selectedThread, setSelectedThread] = useState<MajlisThread | null>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', body: '', tags: '' });
  const [replyText, setReplyText] = useState('');

  // Feature 2: Thread sort + pin
  const [threadSort, setThreadSort] = useState<'latest' | 'replies' | 'reactions' | 'trending'>('latest');

  // Feature 3: Community notification subscriptions
  const [subscribedCommunities, setSubscribedCommunities] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_subscribed_communities') || '[]'); } catch { return []; }
  });

  // Feature 4: Image attachments
  const [newThreadImageUrl, setNewThreadImageUrl] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [showReplyImageInput, setShowReplyImageInput] = useState(false);

  // Feature 6: Community search
  const [communitySearch, setCommunitySearch] = useState('');

  // Feature 7: My Communities (joined)
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_joined_communities') || '[]'); } catch { return []; }
  });

  // Feature 8: Faza history
  const [completedFaza, setCompletedFaza] = useState<Array<{id: string; question: string; pointsEarned: number; answeredAt: string; helperName: string}>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_completed_faza') || '[]'); } catch { return []; }
  });

  // Feature 13: Poll state for create thread
  const [newPoll, setNewPoll] = useState({ enabled: false, question: '', options: ['', ''] });

  // Persist events, faza requests, joined events, and threads to localStorage on every change
  useEffect(() => {
    if (initialCommunityId) onCommunityOpened?.();
  }, []);

  useEffect(() => {
    localStorage.setItem('tripo_events', JSON.stringify(localEvents));
  }, [localEvents]);

  useEffect(() => {
    localStorage.setItem('tripo_faza', JSON.stringify(localFazaRequests));
  }, [localFazaRequests]);

  useEffect(() => {
    localStorage.setItem('tripo_joined_events', JSON.stringify(joinedEvents));
  }, [joinedEvents]);

  useEffect(() => {
    localStorage.setItem('tripo_threads', JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    localStorage.setItem('tripo_thread_reactions', JSON.stringify(threadReactions));
  }, [threadReactions]);

  // Feature 3 persist
  useEffect(() => {
    localStorage.setItem('tripo_subscribed_communities', JSON.stringify(subscribedCommunities));
  }, [subscribedCommunities]);

  // Feature 7 persist
  useEffect(() => {
    localStorage.setItem('tripo_joined_communities', JSON.stringify(joinedCommunities));
  }, [joinedCommunities]);

  // Feature 8 persist
  useEffect(() => {
    localStorage.setItem('tripo_completed_faza', JSON.stringify(completedFaza));
  }, [completedFaza]);

  useEffect(() => {
    // Persist travel posts (filter out past dates on save)
    const today = new Date().toISOString().split('T')[0];
    const valid = travelPosts.filter(p => p.date >= today);
    localStorage.setItem(TRAVEL_POSTS_KEY, JSON.stringify(valid));
  }, [travelPosts]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const [placesData, communitiesData] = await Promise.allSettled([
          placeAPI.getPlaces(),
          communityAPI.getCommunities(),
        ]);

        if (placesData.status === 'fulfilled') {
          const formatted = Array.isArray(placesData.value) ? placesData.value : (placesData.value.data || placesData.value.places || []);
          setAllPlaces(formatted);
        }

        if (communitiesData.status === 'fulfilled' && communitiesData.value.length > 0) {
          setCommunities(communitiesData.value);
        }
        // If API has no communities yet, MOCK_COMMUNITIES stays as the default
      } catch (error) {
        console.error("Failed to load community data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Create Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    mapUrl: '',
    category: '',
    coverPreset: 0,
    maxAttendees: '',
    minAttendees: '',
    recurrence: 'once' as 'once' | 'weekly' | 'monthly',
    isFree: true,
    fee: '',
    requirements: [] as string[],
    organizerNote: '',
    status: 'published' as 'draft' | 'published',
  });
  const [newReqText,   setNewReqText]   = useState('');
  const [eventErrors,  setEventErrors]  = useState<Record<string, string>>({});
  const [eventTouched, setEventTouched] = useState<Record<string, boolean>>({});
  const [wizardStep,   setWizardStep]   = useState<1 | 2 | 3>(1);

  // ── Faza creation wizard ─────────────────────────────────────────────────
  const [showCreateFazaModal, setShowCreateFazaModal] = useState(false);
  const [fazaWizardStep, setFazaWizardStep] = useState<1 | 2 | 3>(1);
  const [fazaSubmitSuccess, setFazaSubmitSuccess] = useState(false);
  const [fazaSubmitting, setFazaSubmitting] = useState(false);
  const [newFazaForm, setNewFazaForm] = useState({
    question: '',
    category: '',
    urgency: 'anytime' as 'today' | 'week' | 'anytime',
    rewardPoints: 50,
    photoUrl: '',
    anonymous: false,
  });
  const [fazaErrors, setFazaErrors] = useState<Record<string, string>>({});

  const [communityMessages, setCommunityMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_community_messages') || '{}'); } catch { return {}; }
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('tripo_community_messages', JSON.stringify(communityMessages));
  }, [communityMessages]);

  useEffect(() => {
    if (activeTab === 'majlis' && selectedThread) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, selectedThread, communityMessages]);

  const handleFazaSubmit = () => {
    if (!fazaAnswer.trim() || !showFazaModal) return;

    const rewardPoints = showFazaModal.pointsReward;
    const cashReward = rewardPoints / 10;
    const newFazaCount = (userProfile.fazaCount || 0) + 1;
    let newRank = userProfile.rank;

    if (newFazaCount >= 10) newRank = "ماستر الفزعات";
    else if (newFazaCount >= 3) newRank = 'شهم';

    setUserProfile(prev => ({
      ...prev,
      karamPoints: (prev.karamPoints || 0) + rewardPoints,
      walletBalance: (prev.walletBalance || 0) + cashReward,
      fazaCount: newFazaCount,
      rank: newRank as any
    }));

    setLocalFazaRequests(prev => prev.filter(r => r.id !== showFazaModal.id));
    setCompletedFaza(prev => [{ id: showFazaModal.id, question: showFazaModal.question, pointsEarned: rewardPoints, answeredAt: new Date().toISOString(), helperName: userProfile.name }, ...prev]);
    setSuccessMessage(lang === 'ar' ? `كفو! حصلت على ${rewardPoints} نقطة كرم و ${cashReward} ريال في محفظتك.` : `Well done! You earned ${rewardPoints} Karam points and ${cashReward} SAR.`);

    setTimeout(() => {
      setSuccessMessage(null);
      setShowFazaModal(null);
      setFazaAnswer('');
    }, 4500);
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!newEvent.title.trim()) errs.title = 'اسم الفعالية مطلوب';
    else if (newEvent.title.trim().length < 4) errs.title = 'الاسم قصير جداً (4 أحرف على الأقل)';
    if (!newEvent.category) errs.category = 'اختر نوع الفعالية';
    return errs;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!newEvent.date) errs.date = 'التاريخ مطلوب';
    else if (new Date(newEvent.date) < new Date(new Date().toDateString())) errs.date = 'التاريخ لا يمكن أن يكون في الماضي';
    if (!newEvent.time) errs.time = 'وقت البداية مطلوب';
    return errs;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!newEvent.isFree && !newEvent.fee) errs.fee = 'أدخل رسوم الدخول';
    if (newEvent.maxAttendees && newEvent.minAttendees) {
      if (parseInt(newEvent.minAttendees) > parseInt(newEvent.maxAttendees)) errs.minAttendees = 'الحد الأدنى أكبر من الأقصى';
    }
    return errs;
  };

  const validateEventForm = () => ({ ...validateStep1(), ...validateStep2(), ...validateStep3() });

  const handleNextStep = () => {
    const errs = wizardStep === 1 ? validateStep1() : validateStep2();
    if (Object.keys(errs).length > 0) {
      setEventErrors(p => ({ ...p, ...errs }));
      setEventTouched(p => { const t = { ...p }; Object.keys(errs).forEach(k => (t[k] = true)); return t; });
      return;
    }
    setEventErrors({});
    setWizardStep(s => (s + 1) as 1 | 2 | 3);
  };

  const handleCreateEvent = () => {
    const errs = validateEventForm();
    const allTouched = { title: true, date: true, time: true, category: true, fee: true, minAttendees: true };
    setEventErrors(errs);
    setEventTouched(allTouched);
    if (Object.keys(errs).length > 0 || !selectedCommunity || isSubmitting) return;
    setIsSubmitting(true);

    const event: ExtendedCommunityEvent = {
      id: Date.now().toString(),
      communityId: selectedCommunity.id,
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time || '20:00',
      endTime: newEvent.endTime || undefined,
      locationName: newEvent.location || 'الرياض',
      mapUrl: newEvent.mapUrl || undefined,
      attendeesCount: 1,
      image: selectedCommunity.image,
      category: newEvent.category || undefined,
      coverPreset: newEvent.coverPreset,
      maxAttendees: newEvent.maxAttendees ? parseInt(newEvent.maxAttendees) : undefined,
      minAttendees: newEvent.minAttendees ? parseInt(newEvent.minAttendees) : undefined,
      recurrence: newEvent.recurrence,
      isFree: newEvent.isFree,
      fee: newEvent.isFree ? 0 : parseFloat(newEvent.fee || '0'),
      requirements: newEvent.requirements.length > 0 ? newEvent.requirements : undefined,
      organizerNote: newEvent.organizerNote || undefined,
      status: newEvent.status,
    };

    setLocalEvents([event, ...localEvents]);
    setShowCreateEventModal(false);
    const isDraft = newEvent.status === 'draft';
    setSuccessMessage(isDraft ? 'تم حفظ المسودة ✅' : (lang === 'ar' ? 'تم نشر الفعالية بنجاح! ننتظر الجميع 🚀' : "Event published! Everyone's invited 🚀"));
    setNewEvent({ title: '', description: '', date: '', time: '', endTime: '', location: '', mapUrl: '', category: '', coverPreset: 0, maxAttendees: '', minAttendees: '', recurrence: 'once', isFree: true, fee: '', requirements: [], organizerNote: '', status: 'published' });
    setNewReqText(''); setEventErrors({}); setEventTouched({}); setWizardStep(1);
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateFaza = () => {
    if (!newFazaForm.question.trim() || !selectedCommunity || fazaSubmitting) return;
    setFazaSubmitting(true);
    const req: FazaRequest = {
      id: Date.now().toString(),
      userId: userProfile.id,
      userName: newFazaForm.anonymous ? 'مجهول الهوية' : userProfile.name,
      userAvatar: newFazaForm.anonymous
        ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=anon'
        : (userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.id}`),
      question: newFazaForm.question.trim(),
      communityId: selectedCommunity.id,
      timestamp: Date.now(),
      pointsReward: newFazaForm.rewardPoints,
    };
    setLocalFazaRequests(prev => [req, ...prev]);
    setUserProfile(prev => ({
      ...prev,
      karamPoints: Math.max(0, (prev.karamPoints || 0) - newFazaForm.rewardPoints),
    }));
    setFazaSubmitting(false);
    setFazaSubmitSuccess(true);
  };

  const resetFazaWizard = () => {
    setShowCreateFazaModal(false);
    setFazaWizardStep(1);
    setFazaSubmitSuccess(false);
    setFazaSubmitting(false);
    setNewFazaForm({ question: '', category: '', urgency: 'anytime', rewardPoints: 50, photoUrl: '', anonymous: false });
    setFazaErrors({});
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedCommunity) return;
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: userProfile.id,
      userName: userProfile.name,
      text: chatInput,
      timestamp: Date.now()
    };

    setCommunityMessages({
      ...communityMessages,
      [selectedCommunity.id]: [...(communityMessages[selectedCommunity.id] || []), newMsg]
    });
    setChatInput('');
  };

  const toggleJoinEvent = (eventId: string) => {
    const evt = localEvents.find(e => e.id === eventId) as ExtendedCommunityEvent | undefined;
    if (joinedEvents.includes(eventId)) {
      setJoinedEvents(joinedEvents.filter(id => id !== eventId));
      setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeesCount: e.attendeesCount - 1 } : e));
    } else {
      if (evt?.maxAttendees && evt.attendeesCount >= evt.maxAttendees) {
        setSuccessMessage('الفعالية ممتلئة — لا توجد أماكن شاغرة حالياً');
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }
      setJoinedEvents([...joinedEvents, eventId]);
      setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeesCount: e.attendeesCount + 1 } : e));
      setSuccessMessage(lang === 'ar' ? "تم تسجيل اهتمامك بالفعالية! ننتظرك هناك 🤩" : "You're registered! See you there 🤩");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // ── Travel Post handlers ──────────────────────────────────────────────────
  const handlePostTrip = () => {
    if (!newTripPost.placeName || !newTripPost.date || isSubmitting) return;
    setIsSubmitting(true);
    const post: TravelPost = {
      id: Date.now().toString(),
      userId: userProfile.id,
      userName: userProfile.name,
      userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.id}`,
      placeName: newTripPost.placeName,
      date: newTripPost.date,
      groupSize: 1,
      maxSize: newTripPost.maxSize,
      description: newTripPost.description,
      interests: newTripPost.interests,
      timestamp: Date.now(),
    };
    setTravelPosts(prev => [post, ...prev]);
    setShowPostTripModal(false);
    setNewTripPost({ placeName: '', date: '', maxSize: 4, description: '', interests: [] });
    setIsSubmitting(false);
    setSuccessMessage("Trip posted! Looking forward to meeting fellow travelers 🤝");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleJoinTrip = (postId: string) => {
    setTravelPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      if (p.joinedByMe) return p; // already joined
      return { ...p, groupSize: p.groupSize + 1, joinedByMe: true };
    }));
    setSuccessMessage("You're in! 🎉 Have a great trip!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateThread = () => {
    if (!newThread.title || !selectedCommunity || isSubmitting) return;
    setIsSubmitting(true);
    const thread: MajlisThread = {
      id: Date.now().toString(),
      communityId: selectedCommunity.id,
      title: newThread.title,
      body: newThread.body,
      authorName: userProfile.name,
      createdAt: new Date().toISOString(),
      tags: newThread.tags.split(',').map(t => t.trim()).filter(Boolean),
      replies: [],
      imageUrl: newThreadImageUrl.trim() || undefined,
      poll: (newPoll.enabled && newPoll.question && newPoll.options.filter(Boolean).length >= 2)
        ? { question: newPoll.question, options: newPoll.options.filter(Boolean), votes: {} }
        : undefined,
    };
    setThreads(prev => ({ ...prev, [selectedCommunity.id]: [thread, ...(prev[selectedCommunity.id] || [])] }));
    setShowCreateThread(false);
    setNewThread({ title: '', body: '', tags: '' });
    setNewThreadImageUrl('');
    setNewPoll({ enabled: false, question: '', options: ['', ''] });
    setIsSubmitting(false);
    setSuccessMessage(lang === 'ar' ? "تم نشر الموضوع بنجاح!" : "Thread published successfully!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleReplyToThread = () => {
    if (!replyText.trim() || !selectedThread || !selectedCommunity) return;
    const reply = { id: Date.now().toString(), text: replyText, authorName: userProfile.name, createdAt: new Date().toISOString(), imageUrl: replyImageUrl.trim() || undefined };
    const updated = { ...selectedThread, replies: [...selectedThread.replies, reply] };
    setSelectedThread(updated);
    setThreads(prev => ({
      ...prev,
      [selectedCommunity.id]: (prev[selectedCommunity.id] || []).map(t => t.id === updated.id ? updated : t)
    }));
    setReplyText('');
    setReplyImageUrl('');
    setShowReplyImageInput(false);
  };

  // Feature 2: Toggle pin
  const handleTogglePin = (threadId: string) => {
    if (!selectedCommunity) return;
    setThreads(prev => ({
      ...prev,
      [selectedCommunity.id]: (prev[selectedCommunity.id] || []).map(t =>
        t.id === threadId ? { ...t, pinned: !t.pinned } : t
      )
    }));
    // Also update selectedThread if it's the one being toggled
    setSelectedThread(prev => prev && prev.id === threadId ? { ...prev, pinned: !prev.pinned } : prev);
  };

  // Feature 13: Vote poll
  const handleVotePoll = (threadId: string, optionIdx: number) => {
    if (!selectedCommunity) return;
    setThreads(prev => ({
      ...prev,
      [selectedCommunity.id]: (prev[selectedCommunity.id] || []).map(t => {
        if (t.id !== threadId || !t.poll) return t;
        return { ...t, poll: { ...t.poll, votes: { ...t.poll.votes, [userProfile.id]: optionIdx } } };
      })
    }));
    // Also update selectedThread
    setSelectedThread(prev => {
      if (!prev || prev.id !== threadId || !prev.poll) return prev;
      return { ...prev, poll: { ...prev.poll, votes: { ...prev.poll.votes, [userProfile.id]: optionIdx } } };
    });
  };

  const handleToggleReaction = (threadId: string, emoji: string) => {
    setThreadReactions(prev => {
      const current = prev[threadId] || {};
      const users = current[emoji] || [];
      const newUsers = users.includes(userProfile.id)
        ? users.filter(u => u !== userProfile.id)
        : [...users, userProfile.id];
      return { ...prev, [threadId]: { ...current, [emoji]: newUsers } };
    });
  };

  const top3Ids = useMemo(() =>
    [...communities].sort((a, b) => b.memberCount - a.memberCount).slice(0, 3).map(c => c.id),
    [communities]
  );

  const filteredCommunities = useMemo(() => {
    let list = categoryFilter === 'الكل' ? communities : communities.filter(c => c.category === categoryFilter);
    if (communitySearch.trim()) {
      const q = communitySearch.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }
    return list;
  }, [communities, categoryFilter, communitySearch]);

  const formatRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    return `منذ ${Math.floor(hrs / 24)} يوم`;
  };

  const renderCommunityCard = (comm: Community) => {
    const isTrending = top3Ids.includes(comm.id);
    const memberSeeds = [`${comm.id}-m1`, `${comm.id}-m2`, `${comm.id}-m3`];
    const isSubscribed = subscribedCommunities.includes(comm.id);
    const isJoined = joinedCommunities.includes(comm.id);
    return (
      <div
        key={comm.id}
        onClick={() => { setSelectedCommunity(comm); setActiveTab('majlis'); setSelectedThread(null); setShowCreateThread(false); }}
        className="relative overflow-hidden rounded-3xl shadow-md active:scale-[0.98] transition-transform cursor-pointer mb-3"
        style={{ height: 160 }}
      >
        {/* Full bleed photo */}
        <img src={comm.image} className="absolute inset-0 w-full h-full object-cover" alt={comm.name} loading="lazy" />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Trending badge top-left */}
        {isTrending && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md z-10">
            <Flame className="w-3 h-3" /> رائج
          </div>
        )}

        {/* Active now + bell indicator top-right (Feature 3) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            onClick={e => { e.stopPropagation(); setSubscribedCommunities(prev => isSubscribed ? prev.filter(id => id !== comm.id) : [...prev, comm.id]); }}
            className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full"
          >
            <Bell className={`w-3.5 h-3.5 ${isSubscribed ? 'text-emerald-400 fill-emerald-400' : 'text-white/60'}`} />
          </button>
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            نشط
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex items-end justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg bg-white/20 backdrop-blur-md w-8 h-8 rounded-xl flex items-center justify-center shrink-0">{comm.icon}</span>
                <h3 className="text-base font-black text-white leading-tight truncate">{comm.name}</h3>
              </div>
              <p className="text-[10px] text-white/70 font-bold">{comm.memberCount.toLocaleString()} {t.commMembers || 'عضو'}</p>
            </div>
            {/* Stacked member avatars + join button (Feature 7) */}
            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
              <div className="flex items-center">
                {memberSeeds.map((seed, i) => (
                  <img
                    key={seed}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                    className="w-7 h-7 rounded-full border-2 border-white/60 bg-white object-cover"
                    style={{ marginLeft: i > 0 ? -10 : 0 }}
                    alt=""
                    loading="lazy"
                  />
                ))}
              </div>
              <button
                onClick={e => { e.stopPropagation(); setJoinedCommunities(prev => isJoined ? prev.filter(id => id !== comm.id) : [...prev, comm.id]); }}
                className={`text-[9px] font-black px-2.5 py-1 rounded-full transition-all ${isJoined ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white backdrop-blur-sm'}`}
              >
                {isJoined ? '✓ منضم' : '+ انضم'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedCommunity) {
    const communityFaza = localFazaRequests.filter(r => r.communityId === selectedCommunity.id);
    const communityEvents = localEvents.filter(e => e.communityId === selectedCommunity.id);
    const messages = communityMessages[selectedCommunity.id] || [{
      id: 'welcome',
      userId: 'system',
      userName: 'تريبو',
      text: `أهلاً بك في مجلس ${selectedCommunity.name}! هنا تبدأ سوالفنا..`,
      timestamp: Date.now()
    }];

    // Computed threads for current community with search filter + sort + pin (Feature 2)
    let communityThreadsList = (threads[selectedCommunity?.id || ''] || []).filter(t =>
      !threadSearch || t.title.toLowerCase().includes(threadSearch.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(threadSearch.toLowerCase()))
    );
    if (threadSort === 'replies') communityThreadsList = [...communityThreadsList].sort((a, b) => b.replies.length - a.replies.length);
    else if (threadSort === 'reactions') communityThreadsList = [...communityThreadsList].sort((a, b) => {
      const rA = Object.values(threadReactions[a.id] || {}).reduce((s, u) => s + u.length, 0);
      const rB = Object.values(threadReactions[b.id] || {}).reduce((s, u) => s + u.length, 0);
      return rB - rA;
    });
    else if (threadSort === 'trending') communityThreadsList = [...communityThreadsList].sort((a, b) => {
      const ageA = Math.max(1, (Date.now() - new Date(a.createdAt).getTime()) / 3600000);
      const ageB = Math.max(1, (Date.now() - new Date(b.createdAt).getTime()) / 3600000);
      const scoreA = (a.replies.length + Object.values(threadReactions[a.id] || {}).reduce((s, u) => s + u.length, 0)) / ageA;
      const scoreB = (b.replies.length + Object.values(threadReactions[b.id] || {}).reduce((s, u) => s + u.length, 0)) / ageB;
      return scoreB - scoreA;
    });
    else communityThreadsList = [...communityThreadsList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // Pinned always first
    const communityThreads = [...communityThreadsList.filter(t => t.pinned), ...communityThreadsList.filter(t => !t.pinned)];

    // اقتراح أماكن للمجلس بناءً على تصنيف المجتمع والأماكن الحقيقية
    const suggestions = allPlaces.filter(p => {
      const placeCategory = p.categoryTags?.[0] || p.category || '';
      return placeCategory.toLowerCase().includes(selectedCommunity.category.toLowerCase());
    }).slice(0, 4);

    return (
      <div className="h-full flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
        <div className="relative h-44 shrink-0">
          <img src={selectedCommunity.image} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
          <button onClick={() => { setSelectedCommunity(null); setSelectedThread(null); setShowCreateThread(false); setThreadSearch(''); }} className="absolute top-6 left-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white z-10 rtl:right-6 rtl:left-auto">
            <ChevronRight className="w-6 h-6 rotate-180 rtl:rotate-0" />
          </button>
          <div className="absolute bottom-4 left-6 right-6 text-white flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">{selectedCommunity.icon} {selectedCommunity.name}</h2>
              <p className="text-[10px] opacity-80 font-bold uppercase tracking-wider">{selectedCommunity.memberCount} عضو نشط حالياً</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge color="orange" className="px-3 py-1 bg-orange-500 text-white border-none shadow-lg shadow-orange-200">
                <Award className="w-3 h-3 inline mr-1" /> {userProfile.rank}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
          {[
            { id: 'majlis', label: t.commMajlis || 'المجلس', icon: MessageSquare },
            { id: 'events', label: 'الفعاليات', icon: Calendar },
            { id: 'requests', label: t.commFazaRequests || 'الفزعات', icon: ShieldCheck },
            { id: 'about', label: 'عن المجتمع', icon: Info }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 text-[10px] font-black transition-all flex flex-col items-center gap-1 border-b-2 ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {/* ──────────────────────────────────────────────────────── */}
          {/* MAJLIS TAB — Forum Thread Views                          */}
          {/* ──────────────────────────────────────────────────────── */}
          {activeTab === 'majlis' && (
            <div className="h-full flex flex-col">
              {/* ── THREAD DETAIL VIEW ── */}
              {selectedThread ? (
                <div className="h-full flex flex-col">
                  {/* Detail header */}
                  <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setSelectedThread(null)}
                      className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 text-sm truncate">{selectedThread.pinned ? '📌 ' : ''}{selectedThread.title}</p>
                      <p className="text-[10px] text-slate-400">{selectedThread.replies.length} رد · {selectedThread.authorName}</p>
                    </div>
                    {/* Pin/unpin button — only for author (Feature 2) */}
                    {selectedThread.authorName === userProfile.name && (
                      <button
                        onClick={() => handleTogglePin(selectedThread.id)}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 ${selectedThread.pinned ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}
                        title={selectedThread.pinned ? 'إلغاء التثبيت' : 'تثبيت الموضوع'}
                      >
                        <span className="text-base">{selectedThread.pinned ? '📌' : '📍'}</span>
                      </button>
                    )}
                  </div>

                  {/* Thread body + replies scroll area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Original post */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                      <h3 className="font-black text-slate-900 text-base mb-3 leading-snug">{selectedThread.title}</h3>
                      {/* Feature 4: Thread image */}
                      {selectedThread.imageUrl && (
                        <img src={selectedThread.imageUrl} className="w-full rounded-2xl object-cover max-h-64 mb-3" alt="" loading="lazy" />
                      )}
                      {selectedThread.body ? (
                        <p className="text-sm text-slate-700 leading-relaxed mb-4">{selectedThread.body}</p>
                      ) : null}
                      {/* Feature 10: Link preview in detail */}
                      {!selectedThread.imageUrl && (() => { const url = extractFirstUrl(selectedThread.body); return url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mt-1 mb-2 text-xs text-slate-600 hover:bg-slate-100 transition">
                          <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate font-medium">{urlDomain(url)}</span>
                          <ExternalLink className="w-3 h-3 text-slate-300 flex-shrink-0 ml-auto" />
                        </a>
                      ) : null; })()}
                      {/* Feature 13: Poll in detail */}
                      {selectedThread.poll && (() => {
                        const poll = selectedThread.poll!;
                        const totalVotes = Object.keys(poll.votes).length;
                        const userVote = poll.votes[userProfile.id];
                        return (
                          <div className="mb-4 bg-slate-50 rounded-2xl p-4">
                            <p className="font-black text-slate-800 text-sm mb-3">{poll.question}</p>
                            <div className="space-y-2">
                              {poll.options.map((opt, idx) => {
                                const voteCount = Object.values(poll.votes).filter(v => v === idx).length;
                                const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                const isLeading = totalVotes > 0 && voteCount === Math.max(...poll.options.map((_, i) => Object.values(poll.votes).filter(v => v === i).length));
                                const isUserChoice = userVote === idx;
                                return (
                                  <button key={idx} onClick={() => handleVotePoll(selectedThread.id, idx)}
                                    className={`w-full relative overflow-hidden rounded-xl px-4 py-2.5 text-left transition-all ${isUserChoice ? 'ring-2 ring-emerald-500' : 'hover:bg-slate-100'}`}
                                    style={{ background: 'white' }}
                                  >
                                    <div className="absolute inset-0 rounded-xl transition-all duration-500" style={{ width: `${pct}%`, background: isLeading ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.12)' }} />
                                    <div className="relative flex items-center justify-between">
                                      <span className="text-sm font-bold text-slate-800">{opt}</span>
                                      <span className="text-xs font-black text-slate-500">{pct}%</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-bold">{totalVotes} صوت</p>
                          </div>
                        );
                      })()}
                      {selectedThread.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {selectedThread.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                              <Hash className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-[10px] font-black text-emerald-700">
                          {selectedThread.authorName.charAt(0)}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">{selectedThread.authorName} · {formatRelativeTime(selectedThread.createdAt)}</p>
                      </div>
                      {/* Emoji reactions on OP */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-bold ml-1">التفاعل:</span>
                        {['👍', '❤️', '😂', '😮'].map(emoji => {
                          const count = (threadReactions[selectedThread.id]?.[emoji] || []).length;
                          const reacted = (threadReactions[selectedThread.id]?.[emoji] || []).includes(userProfile.id);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(selectedThread.id, emoji)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border transition-all active:scale-90 ${reacted ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'}`}
                            >
                              {emoji}{count > 0 && <span className="text-[11px] ml-0.5">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Divider */}
                    {selectedThread.replies.length > 0 && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        {selectedThread.replies.length} {selectedThread.replies.length === 1 ? 'رد' : 'ردود'}
                      </p>
                    )}

                    {/* Replies as chat bubbles */}
                    {selectedThread.replies.map(reply => (
                      <div key={reply.id} className={`flex ${reply.authorName === userProfile.name ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${reply.authorName === userProfile.name ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border border-slate-100 rounded-tl-none'}`}>
                          {reply.authorName !== userProfile.name && (
                            <p className="text-[9px] font-bold opacity-60 mb-1">{reply.authorName}</p>
                          )}
                          {/* Feature 4: Reply image */}
                          {reply.imageUrl && (
                            <img src={reply.imageUrl} className="w-full rounded-xl object-cover max-h-40 mb-2" alt="" loading="lazy" />
                          )}
                          <p className="text-sm">{reply.text}</p>
                          <p className={`text-[9px] mt-1 ${reply.authorName === userProfile.name ? 'opacity-60 text-right' : 'text-slate-400'}`}>
                            {formatRelativeTime(reply.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {selectedThread.replies.length === 0 && (
                      <div className="text-center py-8 text-slate-300">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold">لا يوجد ردود بعد. كن أول من يرد!</p>
                      </div>
                    )}

                    <div ref={threadEndRef} />
                  </div>

                  {/* Reply input (Feature 4: image toggle) */}
                  <div className="bg-white border-t border-slate-100 shrink-0">
                    {showReplyImageInput && (
                      <div className="px-4 pt-3">
                        <input
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-400"
                          placeholder="رابط الصورة https://..."
                          value={replyImageUrl}
                          onChange={e => setReplyImageUrl(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="p-4 flex gap-2">
                      <button
                        onClick={() => setShowReplyImageInput(v => !v)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${showReplyImageInput ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <input
                        className="flex-1 bg-slate-50 rounded-full px-4 py-2.5 text-sm outline-none"
                        placeholder="اكتب ردك هنا..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleReplyToThread()}
                      />
                      <button
                        onClick={handleReplyToThread}
                        className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform rtl:rotate-180"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : showCreateThread ? (
                /* ── CREATE THREAD FORM (inline) ── */
                <div className="h-full flex flex-col">
                  <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => { setShowCreateThread(false); setNewThread({ title: '', body: '', tags: '' }); }}
                      className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="font-black text-slate-900 text-sm">موضوع جديد</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1.5 block">عنوان الموضوع *</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="مثال: أفضل أماكن التمرين في الرياض"
                        value={newThread.title}
                        onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1.5 block">تفاصيل الموضوع</label>
                      <textarea
                        rows={5}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                        placeholder="شارك أفكارك وتفاصيل الموضوع هنا..."
                        value={newThread.body}
                        onChange={(e) => setNewThread({ ...newThread, body: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1.5 block">الوسوم (مفصولة بفاصلة)</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="مثال: رياضة, تمرين, نصيحة"
                        value={newThread.tags}
                        onChange={(e) => setNewThread({ ...newThread, tags: e.target.value })}
                      />
                      {newThread.tags.trim() && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {newThread.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
                              <Hash className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Feature 4: Image URL input */}
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1.5 block">رابط صورة (اختياري)</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="https://..."
                        value={newThreadImageUrl}
                        onChange={(e) => setNewThreadImageUrl(e.target.value)}
                      />
                    </div>

                    {/* Feature 13: Poll section */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setNewPoll(p => ({ ...p, enabled: !p.enabled }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all ${newPoll.enabled ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        📊 {newPoll.enabled ? 'إلغاء الاستفتاء' : 'إضافة استفتاء'}
                      </button>
                      {newPoll.enabled && (
                        <div className="mt-3 space-y-3 bg-slate-50 rounded-2xl p-4">
                          <input
                            className="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="سؤال الاستفتاء..."
                            value={newPoll.question}
                            onChange={e => setNewPoll(p => ({ ...p, question: e.target.value }))}
                          />
                          {newPoll.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                className="flex-1 bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder={`الخيار ${idx + 1}`}
                                value={opt}
                                onChange={e => setNewPoll(p => { const options = [...p.options]; options[idx] = e.target.value; return { ...p, options }; })}
                              />
                              {idx >= 2 && (
                                <button onClick={() => setNewPoll(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))} className="w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-sm font-bold">×</button>
                              )}
                            </div>
                          ))}
                          {newPoll.options.length < 4 && (
                            <button onClick={() => setNewPoll(p => ({ ...p, options: [...p.options, ''] }))} className="text-xs font-black text-emerald-600 flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5" /> إضافة خيار
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleCreateThread}
                      className="w-full py-4 font-black"
                      disabled={!newThread.title.trim() || isSubmitting}
                    >
                      {isSubmitting ? '...' : 'نشر الموضوع'}
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── THREAD LIST VIEW ── */
                <div className="h-full flex flex-col">
                  {/* Search + New Thread toolbar */}
                  <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
                    <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-full px-3 py-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                        placeholder="ابحث في المواضيع..."
                        value={threadSearch}
                        onChange={(e) => setThreadSearch(e.target.value)}
                      />
                      {threadSearch && (
                        <button onClick={() => setThreadSearch('')} className="text-slate-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setShowCreateThread(true)}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-black px-3.5 py-2.5 rounded-full shadow-md active:scale-95 transition-transform whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" /> موضوع +
                    </button>
                  </div>
                  {/* Feature 2: Sort bar */}
                  <div className="bg-white border-b border-slate-100 px-4 pb-2.5 flex gap-2 shrink-0">
                    {([
                      { key: 'latest', label: 'الأحدث' },
                      { key: 'replies', label: 'الأكثر ردوداً' },
                      { key: 'reactions', label: 'الأكثر تفاعلاً' },
                      { key: 'trending', label: 'رائج' },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setThreadSort(opt.key)}
                        className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black border transition-all ${threadSort === opt.key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Thread list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Place suggestions strip */}
                    {suggestions.length > 0 && (
                      <div className="bg-white p-4 rounded-3xl border border-slate-100 mb-2 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                          <h4 className="font-bold text-xs">ترشيحات المجتمع</h4>
                        </div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar">
                          {suggestions.map(p => (
                            <div key={p._id || p.id} className="min-w-[100px] text-center">
                              <img src={p.photos?.[0] || p.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=200'} className="w-full h-14 rounded-xl object-cover mb-1 border border-slate-100" loading="lazy" />
                              <p className="text-[8px] font-bold text-slate-800 line-clamp-1">{p.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {communityThreads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <MessageSquare className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="font-black text-slate-600 mb-1">
                          {threadSearch ? 'لا توجد مواضيع مطابقة' : 'لا توجد مواضيع بعد'}
                        </h4>
                        <p className="text-xs text-slate-400 mb-5">
                          {threadSearch ? 'جرب كلمة بحث مختلفة' : 'كن أول من يبدأ النقاش في هذا المجتمع!'}
                        </p>
                        {!threadSearch && (
                          <button
                            onClick={() => setShowCreateThread(true)}
                            className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-black px-5 py-3 rounded-full shadow-md active:scale-95 transition-transform"
                          >
                            <Plus className="w-4 h-4" /> ابدأ أول نقاش
                          </button>
                        )}
                      </div>
                    ) : (
                      communityThreads.map(thread => (
                        <div
                          key={thread.id}
                          onClick={() => setSelectedThread(thread)}
                          className={`bg-white rounded-3xl p-5 border shadow-sm active:scale-[0.98] transition-transform cursor-pointer ${thread.pinned ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}
                        >
                          {/* Feature 2: Pin badge */}
                          {thread.pinned && (
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">📌 مثبت</span>
                            </div>
                          )}
                          {/* Feature 4: Thread thumbnail image */}
                          {thread.imageUrl && (
                            <img src={thread.imageUrl} className="w-full h-28 rounded-xl object-cover mb-2" alt="" loading="lazy" />
                          )}
                          {/* Title */}
                          <h4 className="font-black text-slate-900 text-sm leading-snug mb-2">{thread.title}</h4>
                          {/* Body preview */}
                          {thread.body ? (
                            <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{thread.body}</p>
                          ) : null}
                          {/* Feature 10: Link preview in list card */}
                          {!thread.imageUrl && (() => { const url = extractFirstUrl(thread.body); return url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mt-1 mb-2 text-xs text-slate-600 hover:bg-slate-100 transition">
                              <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="truncate font-medium">{urlDomain(url)}</span>
                              <ExternalLink className="w-3 h-3 text-slate-300 flex-shrink-0 ml-auto" />
                            </a>
                          ) : null; })()}
                          {/* Feature 13: Poll compact preview */}
                          {thread.poll && (
                            <div className="flex items-center gap-2 mb-2 bg-slate-50 rounded-xl px-3 py-2">
                              <span className="text-[10px]">📊</span>
                              <span className="text-[10px] font-bold text-slate-600 truncate">{thread.poll.question}</span>
                              <span className="text-[9px] text-slate-400 shrink-0">{thread.poll.options.length} خيارات</span>
                            </div>
                          )}
                          {/* Tags */}
                          {thread.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {thread.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                  <Hash className="w-2 h-2" />{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Footer: author, date, replies */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[8px] font-black text-emerald-700">
                                {thread.authorName.charAt(0)}
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold">{thread.authorName} · {formatRelativeTime(thread.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                              <MessageCircle className="w-3 h-3" />
                              <span>{thread.replies.length}</span>
                            </div>
                          </div>
                          {/* Emoji reactions */}
                          <div className="flex items-center gap-1.5 mt-2.5">
                            {['👍', '❤️', '😂', '😮'].map(emoji => {
                              const count = (threadReactions[thread.id]?.[emoji] || []).length;
                              const reacted = (threadReactions[thread.id]?.[emoji] || []).includes(userProfile.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={(e) => { e.stopPropagation(); handleToggleReaction(thread.id, emoji); }}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all active:scale-90 ${reacted ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                                >
                                  {emoji}{count > 0 && <span className="ml-0.5">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="h-full overflow-y-auto p-4 space-y-6 pb-20">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
                <h3 className="text-lg font-black mb-1">جدول طلعاتنا 🗓️</h3>
                <p className="text-xs opacity-90 mb-4">هنا تلقى كل الفعاليات المجدولة من قبل المشرفين والأعضاء الموثوقين.</p>
                <Button onClick={() => setShowCreateEventModal(true)} variant="secondary" className="bg-white/20 border-white/30 text-white py-2 text-xs w-fit flex items-center gap-2">
                  <Plus className="w-3 h-3" /> اقترح فعالية
                </Button>
              </div>

              <div className="space-y-4">
                {communityEvents.length === 0 ? (
                  <div className="text-center py-20 text-slate-300">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">لا توجد فعاليات مجدولة لهذا المجتمع حالياً</p>
                  </div>
                ) : communityEvents.map(event => {
                  const ext = event as ExtendedCommunityEvent;
                  const catInfo = EVENT_CATEGORIES.find(c => c.id === ext.category);
                  const cover   = ext.coverPreset !== undefined ? COVER_PRESETS[ext.coverPreset] : null;
                  const isFull  = !!ext.maxAttendees && event.attendeesCount >= ext.maxAttendees;
                  const spotsLeft = ext.maxAttendees ? ext.maxAttendees - event.attendeesCount : null;
                  const needsMore = ext.minAttendees ? Math.max(0, ext.minAttendees - event.attendeesCount) : 0;
                  const isDraft   = ext.status === 'draft';
                  return (
                  <div key={event.id} className={`bg-white rounded-3xl overflow-hidden shadow-sm border ${isDraft ? 'border-amber-200' : 'border-slate-100'}`}>
                    {/* Cover */}
                    <div className="h-32 relative">
                      {cover ? (
                        <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: cover.bg }}>{cover.emoji}</div>
                      ) : (
                        <img src={event.image} className="w-full h-full object-cover" loading="lazy" />
                      )}
                      {/* Badges overlay */}
                      <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap rtl:right-3 rtl:left-auto">
                        <div className="bg-white/90 px-2 py-1 rounded-lg text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {event.date}
                        </div>
                        {catInfo && (
                          <div className="bg-white/90 px-2 py-1 rounded-lg text-xs font-bold text-slate-700">
                            {catInfo.emoji} {catInfo.label}
                          </div>
                        )}
                        {isDraft && (
                          <div className="bg-amber-400/90 px-2 py-1 rounded-lg text-xs font-bold text-amber-900">مسودة</div>
                        )}
                      </div>
                      <div className="absolute bottom-3 right-3 flex gap-1.5 rtl:left-3 rtl:right-auto">
                        <div className="bg-black/60 px-2 py-1 rounded-lg text-[10px] text-white font-bold flex items-center gap-1">
                          <Users className="w-3 h-3" /> {event.attendeesCount}{ext.maxAttendees ? `/${ext.maxAttendees}` : ''} خوي
                        </div>
                        {ext.isFree === false && ext.fee ? (
                          <div className="bg-black/60 px-2 py-1 rounded-lg text-[10px] text-yellow-300 font-bold">{ext.fee} ر.س</div>
                        ) : ext.isFree !== false ? (
                          <div className="bg-black/60 px-2 py-1 rounded-lg text-[10px] text-emerald-300 font-bold">مجاني</div>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Recurrence badge */}
                      {ext.recurrence && ext.recurrence !== 'once' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full mb-2">
                          🔁 {ext.recurrence === 'weekly' ? 'أسبوعياً' : 'شهرياً'}
                        </span>
                      )}

                      <h4 className="font-black text-slate-900 mb-1">{event.title}</h4>
                      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{event.description}</p>

                      {/* Requirements */}
                      {ext.requirements && ext.requirements.length > 0 && (
                        <div className="mb-3 space-y-1">
                          {ext.requirements.map((r, i) => (
                            <p key={i} className="text-[10px] text-slate-500 flex items-center gap-1">
                              <span className="text-emerald-500 font-bold">•</span> {r}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Time + Location */}
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold mb-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {event.time}{ext.endTime ? ` – ${ext.endTime}` : ''}
                        </span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.locationName}</span>
                      </div>

                      {/* Map link */}
                      {ext.mapUrl && (
                        <a href={ext.mapUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-blue-500 font-bold mb-3 hover:underline"
                          onClick={e => e.stopPropagation()}>
                          <ExternalLink className="w-3 h-3" /> فتح الخريطة
                        </a>
                      )}

                      {/* Organizer note */}
                      {ext.organizerNote && (
                        <p className="text-[10px] text-slate-400 italic mb-3">💬 {ext.organizerNote}</p>
                      )}

                      {/* Min attendees warning */}
                      {needsMore > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3 text-[10px] text-amber-700 font-bold">
                          ⚠️ يحتاج {needsMore} مشارك إضافي للتأكيد
                        </div>
                      )}

                      {/* Spots remaining */}
                      {spotsLeft !== null && spotsLeft <= 3 && spotsLeft > 0 && (
                        <p className="text-[10px] text-red-500 font-bold mb-3">🔴 {spotsLeft} أماكن متبقية فقط!</p>
                      )}

                      <Button
                        onClick={() => toggleJoinEvent(event.id)}
                        disabled={isFull && !joinedEvents.includes(event.id)}
                        className={`w-full py-2.5 text-xs font-black ${
                          joinedEvents.includes(event.id) ? 'bg-slate-100 text-slate-500 shadow-none' :
                          isFull ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed' : ''
                        }`}
                      >
                        {joinedEvents.includes(event.id) ? 'تم تسجيل الاهتمام ✅' : isFull ? 'الفعالية ممتلئة' : 'سجل اهتمامك'}
                      </Button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="h-full overflow-y-auto p-4 space-y-6 pb-24">
              {/* Header with "ask" button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-base">الفزعات</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">اطلب المساعدة واكسب نقاط الكرم</p>
                </div>
                <button
                  onClick={() => { setShowCreateFazaModal(true); setFazaWizardStep(1); }}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-md active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" /> طلب فزعة
                </button>
              </div>
              <section>
                {communityFaza.length === 0 ? (
                  <div className="text-center py-16 text-slate-300">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold text-slate-400">لا توجد فزعات حالياً</p>
                    <p className="text-xs text-slate-300 mt-1">كن أول من يطلب مساعدة المجتمع!</p>
                    <button
                      onClick={() => { setShowCreateFazaModal(true); setFazaWizardStep(1); }}
                      className="mt-4 bg-emerald-600 text-white text-xs font-black px-6 py-3 rounded-2xl shadow-md active:scale-95 transition-transform inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> اطلب فزعة الآن
                    </button>
                  </div>
                ) : communityFaza.map(req => (
                  <div key={req.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={req.userAvatar} className="w-10 h-10 rounded-full border-2 border-emerald-100" loading="lazy" />
                      <div>
                        <p className="text-xs font-black text-slate-900">{req.userName}</p>
                        <p className="text-[10px] text-slate-400">منذ ساعة</p>
                      </div>
                      <div className="ml-auto bg-orange-50 px-3 py-1 rounded-xl text-orange-600 text-xs font-black rtl:mr-auto rtl:ml-0">
                        +{req.pointsReward} كرم
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mb-5 font-medium leading-relaxed">"{req.question}"</p>
                    <Button onClick={() => setShowFazaModal(req)} className="w-full py-2.5 text-xs font-black" variant="secondary">تقديم فزعة</Button>
                  </div>
                ))}
              </section>
              {/* Feature 8: Completed Faza history */}
              {completedFaza.length > 0 && (
                <section>
                  <h3 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> الفزعات المنجزة
                  </h3>
                  <div className="space-y-2">
                    {completedFaza.map(fz => (
                      <div key={fz.id} className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{fz.question}</p>
                          <p className="text-[10px] text-slate-400">{formatRelativeTime(fz.answeredAt)}</p>
                        </div>
                        <span className="shrink-0 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">+{fz.pointsEarned}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Feature 11: About tab */}
          {activeTab === 'about' && (() => {
            const aboutData = COMMUNITY_ABOUT[selectedCommunity.id] || COMMUNITY_ABOUT['default'];
            return (
              <div className="h-full overflow-y-auto p-4 space-y-4 pb-20">
                {/* Header */}
                <div className="flex items-center gap-3 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                  <span className="text-3xl">{selectedCommunity.icon}</span>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{selectedCommunity.name}</h3>
                    <p className="text-[10px] text-slate-400">{selectedCommunity.memberCount.toLocaleString()} عضو</p>
                  </div>
                </div>
                {/* About text */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                  <h4 className="font-black text-slate-700 text-sm mb-2 flex items-center gap-2"><Info className="w-4 h-4 text-emerald-600" /> عن المجتمع</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{aboutData.about}</p>
                </div>
                {/* Rules list */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                  <h4 className="font-black text-slate-700 text-sm mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" /> قواعد المجتمع</h4>
                  <ol className="space-y-3">
                    {aboutData.rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                        <p className="text-sm text-slate-700 leading-snug">{rule}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                {/* Contact admin button */}
                <button
                  onClick={() => { setSuccessMessage('تم إرسال رسالتك للمشرف 📩'); setTimeout(() => setSuccessMessage(null), 3000); }}
                  className="w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl text-sm active:scale-95 transition-transform"
                >
                  تواصل مع المشرف
                </button>
              </div>
            );
          })()}
        </div>

        {/* ── Create Event Wizard ─────────────────────────────────────── */}
        {showCreateEventModal && (() => {
          const closeModal = () => { setShowCreateEventModal(false); setEventErrors({}); setEventTouched({}); setWizardStep(1); };
          const selectedCat = EVENT_CATEGORIES.find(c => c.id === newEvent.category);
          const cover = COVER_PRESETS[newEvent.coverPreset];

          const STEPS = [
            { num: 1, title: 'الأساسيات',        sub: 'اسم الفعالية ونوعها وشكلها' },
            { num: 2, title: 'الموعد والمكان',    sub: 'متى وأين تنعقد الفعالية'   },
            { num: 3, title: 'التفاصيل والنشر',   sub: 'المعلومات الإضافية والنشر'  },
          ];
          const current = STEPS[wizardStep - 1];

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
              <div className="bg-slate-50 w-full rounded-t-[32px] shadow-2xl flex flex-col" style={{ maxHeight: '93vh' }}>

                {/* ── Fixed header ── */}
                <div className="flex-shrink-0 bg-white rounded-t-[32px] px-6 pt-5 pb-4 shadow-sm">
                  {/* Drag handle */}
                  <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

                  {/* Step indicator */}
                  <div className="flex items-center gap-2 mb-5">
                    {STEPS.map((s, i) => (
                      <React.Fragment key={s.num}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                          wizardStep > s.num ? 'bg-indigo-600 text-white scale-95' :
                          wizardStep === s.num ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {wizardStep > s.num ? '✓' : s.num}
                        </div>
                        {i < 2 && (
                          <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-100">
                            <div className={`h-full bg-indigo-600 rounded-full transition-all duration-500 ${wizardStep > s.num ? 'w-full' : 'w-0'}`} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Step title row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 leading-tight">{current.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{current.sub}</p>
                    </div>
                    <button onClick={closeModal} className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* ── Scrollable step body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                  {/* ════════════════ STEP 1 ════════════════ */}
                  {wizardStep === 1 && (
                    <>
                      {/* Live card preview */}
                      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">معاينة الفعالية</p>
                        <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm mx-auto" style={{ maxWidth: 240 }}>
                          <div className="h-20 flex items-center justify-center text-4xl" style={{ background: cover.bg }}>
                            {cover.emoji}
                          </div>
                          <div className="p-3 bg-white">
                            <p className={`font-black text-sm leading-tight truncate ${newEvent.title ? 'text-slate-900' : 'text-slate-300'}`}>
                              {newEvent.title || 'اسم الفعالية...'}
                            </p>
                            {selectedCat ? (
                              <span className="text-[10px] text-indigo-500 font-bold">{selectedCat.emoji} {selectedCat.label}</span>
                            ) : (
                              <span className="text-[10px] text-slate-300">اختر النوع أدناه</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-1">
                        <p className="text-sm font-black text-slate-700 mb-2">اسم الفعالية <span className="text-red-400">*</span></p>
                        <input
                          className={`w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 transition-all border ${
                            eventErrors.title && eventTouched.title ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 focus:ring-indigo-300'
                          }`}
                          placeholder="مثال: تجمع بادل السبت"
                          value={newEvent.title}
                          onChange={e => {
                            setNewEvent(p => ({ ...p, title: e.target.value }));
                            if (eventTouched.title) setEventErrors(p => ({ ...p, title: e.target.value.trim().length < 4 && e.target.value.trim() ? 'الاسم قصير جداً' : '' }));
                          }}
                          onBlur={() => { setEventTouched(p => ({ ...p, title: true })); const e = validateStep1(); setEventErrors(p => ({ ...p, title: e.title || '' })); }}
                        />
                        {eventErrors.title && eventTouched.title && (
                          <p className="text-red-500 text-xs flex items-center gap-1 pt-1"><span>⚠</span>{eventErrors.title}</p>
                        )}
                      </div>

                      {/* Category */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-3">نوع الفعالية <span className="text-red-400">*</span></p>
                        <div className="grid grid-cols-4 gap-2">
                          {EVENT_CATEGORIES.map(cat => (
                            <button key={cat.id} type="button"
                              onClick={() => { setNewEvent(p => ({ ...p, category: cat.id })); setEventErrors(p => ({ ...p, category: '' })); }}
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                                newEvent.category === cat.id
                                  ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100'
                                  : 'border-slate-100 bg-white hover:border-slate-200'
                              }`}
                            >
                              <span className="text-2xl">{cat.emoji}</span>
                              <span className={`text-[9px] font-black leading-tight text-center ${newEvent.category === cat.id ? 'text-indigo-700' : 'text-slate-500'}`}>{cat.label}</span>
                            </button>
                          ))}
                        </div>
                        {eventErrors.category && eventTouched.category && (
                          <p className="text-red-500 text-xs flex items-center gap-1 mt-2"><span>⚠</span>{eventErrors.category}</p>
                        )}
                      </div>

                      {/* Cover */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-3">غلاف الفعالية</p>
                        <div className="flex gap-3">
                          {COVER_PRESETS.map((preset, idx) => (
                            <button key={idx} type="button"
                              onClick={() => setNewEvent(p => ({ ...p, coverPreset: idx }))}
                              className={`flex-1 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-95 ${
                                newEvent.coverPreset === idx ? 'ring-3 ring-indigo-500 ring-offset-2 scale-105 shadow-lg' : 'opacity-60 hover:opacity-90'
                              }`}
                              style={{ background: preset.bg }}
                            >
                              {preset.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════ STEP 2 ════════════════ */}
                  {wizardStep === 2 && (
                    <>
                      {/* Date & time */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                        <p className="text-sm font-black text-slate-700">التاريخ والوقت</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1.5">التاريخ <span className="text-red-400">*</span></p>
                            <input type="date"
                              className={`w-full bg-slate-50 rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 border transition-all ${
                                eventErrors.date && eventTouched.date ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 focus:ring-indigo-300'
                              }`}
                              value={newEvent.date}
                              onChange={e => { setNewEvent(p => ({ ...p, date: e.target.value })); if (eventTouched.date) { const er = validateStep2(); setEventErrors(p => ({ ...p, date: er.date || '' })); } }}
                              onBlur={() => { setEventTouched(p => ({ ...p, date: true })); const er = validateStep2(); setEventErrors(p => ({ ...p, date: er.date || '' })); }}
                            />
                            {eventErrors.date && eventTouched.date && <p className="text-red-500 text-xs mt-1">⚠ {eventErrors.date}</p>}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1.5">وقت البداية <span className="text-red-400">*</span></p>
                            <input type="time"
                              className={`w-full bg-slate-50 rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 border transition-all ${
                                eventErrors.time && eventTouched.time ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 focus:ring-indigo-300'
                              }`}
                              value={newEvent.time}
                              onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                              onBlur={() => { setEventTouched(p => ({ ...p, time: true })); const er = validateStep2(); setEventErrors(p => ({ ...p, time: er.time || '' })); }}
                            />
                            {eventErrors.time && eventTouched.time && <p className="text-red-500 text-xs mt-1">⚠ {eventErrors.time}</p>}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1.5">وقت الانتهاء <span className="text-slate-300 font-normal">(اختياري)</span></p>
                          <input type="time"
                            className="w-full bg-slate-50 rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100"
                            value={newEvent.endTime}
                            onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))}
                          />
                        </div>

                        {/* Recurrence */}
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-2">التكرار</p>
                          <div className="flex gap-2">
                            {RECURRENCE_OPTS.map(opt => (
                              <button key={opt.id} type="button"
                                onClick={() => setNewEvent(p => ({ ...p, recurrence: opt.id }))}
                                className={`flex-1 py-2.5 rounded-2xl text-xs font-black border-2 transition-all active:scale-95 ${
                                  newEvent.recurrence === opt.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 bg-white'
                                }`}
                              >{opt.label}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
                        <p className="text-sm font-black text-slate-700">المكان</p>
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1.5">اسم الموقع</p>
                          <input
                            className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100"
                            placeholder="مثال: ملاعب فور بادل، حي النرجس"
                            value={newEvent.location}
                            onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1.5">رابط الخريطة <span className="text-slate-300 font-normal">(اختياري)</span></p>
                          <input
                            className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100"
                            placeholder="https://maps.google.com/..."
                            value={newEvent.mapUrl}
                            onChange={e => setNewEvent(p => ({ ...p, mapUrl: e.target.value }))}
                          />
                          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> الصق رابط Google Maps أو Apple Maps
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ════════════════ STEP 3 ════════════════ */}
                  {wizardStep === 3 && (
                    <>
                      {/* Description */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-3">وصف الفعالية <span className="text-slate-300 text-xs font-normal">(اختياري)</span></p>
                        <textarea
                          className="w-full h-28 bg-slate-50 rounded-2xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100 resize-none"
                          placeholder="اكتب وصفاً للفعالية وما يمكن للمشاركين توقعه..."
                          value={newEvent.description}
                          onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                        />
                        <p className="text-[10px] text-slate-300 text-left mt-1">{newEvent.description.length}/300</p>
                      </div>

                      {/* Requirements */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-1">ماذا يجب أن يحضر المشاركون؟</p>
                        <p className="text-[10px] text-slate-400 mb-3">اضغط Enter أو + لإضافة كل عنصر</p>
                        {newEvent.requirements.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {newEvent.requirements.map((req, i) => (
                              <div key={i} className="flex items-center gap-2 bg-indigo-50 rounded-xl px-3 py-2">
                                <span className="text-indigo-400 font-black text-sm">•</span>
                                <span className="flex-1 text-sm text-slate-700 font-medium">{req}</span>
                                <button type="button" onClick={() => setNewEvent(p => ({ ...p, requirements: p.requirements.filter((_, j) => j !== i) }))}
                                  className="text-slate-300 hover:text-red-400 transition-colors active:scale-90">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {newEvent.requirements.length < 6 && (
                          <div className="flex gap-2">
                            <input
                              className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                              placeholder="مثال: أحضر مضربك الخاص"
                              value={newReqText}
                              onChange={e => setNewReqText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && newReqText.trim()) { e.preventDefault(); setNewEvent(p => ({ ...p, requirements: [...p.requirements, newReqText.trim()] })); setNewReqText(''); } }}
                            />
                            <button type="button" disabled={!newReqText.trim()}
                              onClick={() => { if (newReqText.trim()) { setNewEvent(p => ({ ...p, requirements: [...p.requirements, newReqText.trim()] })); setNewReqText(''); } }}
                              className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-all shadow-sm shadow-indigo-200">
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Capacity */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-3">عدد المشاركين</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1.5">الحد الأقصى</p>
                            <input type="number" min="1"
                              className="w-full bg-slate-50 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100"
                              placeholder="بلا حد"
                              value={newEvent.maxAttendees}
                              onChange={e => setNewEvent(p => ({ ...p, maxAttendees: e.target.value }))}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1.5">الحد الأدنى للانعقاد</p>
                            <input type="number" min="1"
                              className={`w-full bg-slate-50 rounded-2xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 border transition-all ${
                                eventErrors.minAttendees ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 focus:ring-indigo-300'
                              }`}
                              placeholder="1"
                              value={newEvent.minAttendees}
                              onChange={e => { setNewEvent(p => ({ ...p, minAttendees: e.target.value })); const er = validateStep3(); setEventErrors(p => ({ ...p, minAttendees: er.minAttendees || '' })); }}
                            />
                            {eventErrors.minAttendees && <p className="text-red-500 text-xs mt-1">⚠ {eventErrors.minAttendees}</p>}
                          </div>
                        </div>
                        {newEvent.minAttendees && (
                          <p className="text-[10px] text-slate-400 mt-2">⚠️ ستُلغى الفعالية إذا لم يصل عدد المشاركين إلى {newEvent.minAttendees}</p>
                        )}
                      </div>

                      {/* Fee */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-3">رسوم الدخول</p>
                        <div className="flex gap-2 mb-3">
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, isFree: true, fee: '' }))}
                            className={`flex-1 py-3 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${newEvent.isFree ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-100 text-slate-500 bg-white'}`}>
                            🆓 مجاني
                          </button>
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, isFree: false }))}
                            className={`flex-1 py-3 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${!newEvent.isFree ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-100 text-slate-500 bg-white'}`}>
                            💰 مدفوع
                          </button>
                        </div>
                        {!newEvent.isFree && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 mb-1.5">المبلغ (ريال) <span className="text-red-400">*</span></p>
                            <input type="number" min="0" step="0.5"
                              className={`w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 border transition-all ${
                                eventErrors.fee && eventTouched.fee ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 focus:ring-indigo-300'
                              }`}
                              placeholder="0.00"
                              value={newEvent.fee}
                              onChange={e => { setNewEvent(p => ({ ...p, fee: e.target.value })); setEventTouched(p => ({ ...p, fee: true })); if (e.target.value) setEventErrors(p => ({ ...p, fee: '' })); }}
                            />
                            {eventErrors.fee && eventTouched.fee && <p className="text-red-500 text-xs mt-1">⚠ {eventErrors.fee}</p>}
                          </div>
                        )}
                      </div>

                      {/* Organizer note */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-1">ملاحظة للمشاركين <span className="text-slate-300 text-xs font-normal">(اختياري)</span></p>
                        <p className="text-[10px] text-slate-400 mb-3">مثل رقم التواصل أو تعليمات خاصة</p>
                        <input
                          className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100"
                          placeholder="مثال: راسلني على واتساب قبل الحضور"
                          value={newEvent.organizerNote}
                          onChange={e => setNewEvent(p => ({ ...p, organizerNote: e.target.value }))}
                        />
                      </div>

                      {/* Publish toggle */}
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                        <p className="text-sm font-black text-slate-700 mb-3">طريقة النشر</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, status: 'published' }))}
                            className={`flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${newEvent.status === 'published' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                            <span className="text-2xl">🚀</span>
                            <span className={`text-xs font-black ${newEvent.status === 'published' ? 'text-indigo-700' : 'text-slate-500'}`}>نشر الآن</span>
                            <span className={`text-[9px] text-center leading-tight ${newEvent.status === 'published' ? 'text-indigo-400' : 'text-slate-300'}`}>يراها الأعضاء فوراً</span>
                          </button>
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, status: 'draft' }))}
                            className={`flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${newEvent.status === 'draft' ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-slate-100 bg-white'}`}>
                            <span className="text-2xl">📝</span>
                            <span className={`text-xs font-black ${newEvent.status === 'draft' ? 'text-amber-700' : 'text-slate-500'}`}>مسودة</span>
                            <span className={`text-[9px] text-center leading-tight ${newEvent.status === 'draft' ? 'text-amber-400' : 'text-slate-300'}`}>يمكنك نشرها لاحقاً</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Fixed footer ── */}
                <div className="flex-shrink-0 bg-white border-t border-slate-100 px-6 py-4">
                  <div className="flex gap-3">
                    {wizardStep > 1 && (
                      <button type="button"
                        onClick={() => { setWizardStep(s => (s - 1) as 1 | 2 | 3); setEventErrors({}); }}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-sm active:scale-95 transition-all">
                        ← رجوع
                      </button>
                    )}
                    {wizardStep < 3 ? (
                      <button type="button" onClick={handleNextStep}
                        className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-sm active:scale-95 transition-all shadow-lg shadow-indigo-200">
                        التالي →
                      </button>
                    ) : (
                      <button type="button" onClick={handleCreateEvent} disabled={isSubmitting}
                        className="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white font-black text-sm active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:opacity-60 flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            جاري النشر...
                          </>
                        ) : newEvent.status === 'draft' ? '💾 حفظ المسودة' : '🚀 نشر الفعالية'}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* ── Create Faza Request Wizard ─────────────────────────────── */}
        {showCreateFazaModal && (() => {
          const FAZA_STEPS = [
            { num: 1, title: 'سؤالك',        sub: 'وصف طلبك بوضوح' },
            { num: 2, title: 'المكافأة',      sub: 'حدد نقاط الكرم' },
            { num: 3, title: 'المراجعة',      sub: 'راجع وأرسل' },
          ];
          const selectedCat = FAZA_CATEGORIES.find(c => c.id === newFazaForm.category);
          const urgencyOpt  = FAZA_URGENCY.find(u => u.id === newFazaForm.urgency)!;
          const rewardLabel = newFazaForm.rewardPoints >= 150 ? '🔥 جذاب جداً' : newFazaForm.rewardPoints >= 75 ? '👍 عادي' : '📉 منخفض';
          const rewardColor = newFazaForm.rewardPoints >= 150 ? '#10b981' : newFazaForm.rewardPoints >= 75 ? '#f59e0b' : '#ef4444';
          const walletPts   = userProfile.karamPoints || 0;
          const similarFaza = localFazaRequests.filter(r =>
            r.communityId === selectedCommunity!.id &&
            newFazaForm.question.trim().length > 5 &&
            r.question.split(' ').some(w => w.length > 3 && newFazaForm.question.includes(w))
          ).slice(0, 2);

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={resetFazaWizard}>
              <div
                className="bg-slate-50 w-full rounded-t-[32px] shadow-2xl flex flex-col"
                style={{ maxHeight: '93vh' }}
                onClick={e => e.stopPropagation()}
              >
                {fazaSubmitSuccess ? (
                  /* ── Success Screen ─────────────────────────────────── */
                  <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-4xl animate-bounce">🎉</div>
                    <h3 className="font-black text-2xl text-slate-900">تم إرسال فزعتك!</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      طلبك وصل لأعضاء <span className="font-black text-slate-700">{selectedCommunity!.name}</span>.<br/>
                      عادةً يجاوب الأعضاء خلال ساعة ⚡
                    </p>
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3 flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div className="text-right rtl:text-right ltr:text-left">
                        <p className="text-xs font-black text-slate-900">تم خصم {newFazaForm.rewardPoints} نقطة كرم</p>
                        <p className="text-[10px] text-slate-400">ستُعاد إذا لم يُجب أحد خلال 48 ساعة</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: 'فزعتي في تريبو', text: newFazaForm.question });
                        }
                      }}
                      className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform"
                    >
                      📤 شارك فزعتك
                    </button>
                    <button
                      onClick={resetFazaWizard}
                      className="bg-emerald-600 text-white font-black text-sm px-10 py-3.5 rounded-2xl active:scale-95 transition-transform"
                    >
                      تمام 👌
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Fixed Header */}
                    <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-white rounded-t-[32px] shrink-0">
                      {/* Drag handle */}
                      <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
                      {/* Step indicator */}
                      <div className="flex items-center gap-1 mb-4">
                        {FAZA_STEPS.map((s, i) => (
                          <React.Fragment key={s.num}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                              fazaWizardStep > s.num ? 'bg-emerald-600 text-white scale-95' :
                              fazaWizardStep === s.num ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' :
                              'bg-slate-100 text-slate-400'
                            }`}>
                              {fazaWizardStep > s.num ? '✓' : s.num}
                            </div>
                            {i < 2 && (
                              <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-100">
                                <div className={`h-full bg-emerald-600 rounded-full transition-all duration-500 ${fazaWizardStep > s.num ? 'w-full' : 'w-0'}`} />
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-black text-lg text-slate-900">{FAZA_STEPS[fazaWizardStep - 1].title}</h3>
                          <p className="text-xs text-slate-400">{FAZA_STEPS[fazaWizardStep - 1].sub}</p>
                        </div>
                        <button onClick={resetFazaWizard} className="p-2 bg-slate-50 rounded-full active:scale-90 transition-transform">
                          <X className="w-5 h-5 text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                      {/* ── Step 1: The Ask ─────────────────────────── */}
                      {fazaWizardStep === 1 && (
                        <>
                          {/* Quick Templates */}
                          <div>
                            <p className="text-xs font-black text-slate-500 mb-2 uppercase tracking-wider">ابدأ من هنا</p>
                            <div className="flex flex-wrap gap-2">
                              {FAZA_TEMPLATES.map(tpl => (
                                <button
                                  key={tpl}
                                  onClick={() => setNewFazaForm(p => ({ ...p, question: p.question ? p.question : tpl }))}
                                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl active:scale-95 transition-transform hover:border-emerald-400 hover:text-emerald-600"
                                >
                                  {tpl}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Question Textarea */}
                          <div>
                            <p className="text-xs font-black text-slate-500 mb-2">سؤالك <span className="text-red-400">*</span></p>
                            <div className="relative">
                              <textarea
                                className={`w-full h-32 p-4 bg-white rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed ${fazaErrors.question ? 'border-red-300' : 'border-slate-200'}`}
                                placeholder="اكتب سؤالك بوضوح... كلما كان واضحاً، كلما جاءتك إجابات أفضل"
                                maxLength={280}
                                value={newFazaForm.question}
                                onChange={e => {
                                  setNewFazaForm(p => ({ ...p, question: e.target.value }));
                                  if (fazaErrors.question) setFazaErrors(p => ({ ...p, question: '' }));
                                }}
                              />
                              <span className={`absolute bottom-3 left-3 text-[10px] font-bold ${newFazaForm.question.length > 250 ? 'text-red-400' : 'text-slate-300'}`}>
                                {newFazaForm.question.length}/280
                              </span>
                            </div>
                            {fazaErrors.question && <p className="text-xs text-red-500 mt-1 font-bold">{fazaErrors.question}</p>}
                          </div>

                          {/* Category */}
                          <div>
                            <p className="text-xs font-black text-slate-500 mb-2">نوع المساعدة</p>
                            <div className="grid grid-cols-4 gap-2">
                              {FAZA_CATEGORIES.map(cat => (
                                <button
                                  key={cat.id}
                                  onClick={() => setNewFazaForm(p => ({ ...p, category: cat.id }))}
                                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all active:scale-95 ${
                                    newFazaForm.category === cat.id
                                      ? 'border-emerald-400 bg-emerald-50'
                                      : 'border-slate-100 bg-white'
                                  }`}
                                >
                                  <span className="text-xl">{cat.emoji}</span>
                                  <span className="text-[9px] font-black text-slate-600">{cat.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── Step 2: Reward & Urgency ─────────────── */}
                      {fazaWizardStep === 2 && (
                        <>
                          {/* Points Slider */}
                          <div className="bg-white rounded-2xl border border-slate-100 p-5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-black text-slate-700">مكافأة الكرم</p>
                              <span className="text-xs font-black" style={{ color: rewardColor }}>{rewardLabel}</span>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-3xl font-black text-slate-900">{newFazaForm.rewardPoints}</span>
                              <span className="text-xs text-slate-400 font-bold">نقطة كرم</span>
                            </div>
                            <input
                              type="range"
                              min={10}
                              max={Math.min(200, walletPts)}
                              step={10}
                              value={newFazaForm.rewardPoints}
                              onChange={e => setNewFazaForm(p => ({ ...p, rewardPoints: parseInt(e.target.value) }))}
                              className="w-full accent-emerald-600 h-2"
                            />
                            <div className="flex justify-between text-[9px] text-slate-300 mt-1 font-bold">
                              <span>10</span>
                              <span>رصيدك: {walletPts} نقطة</span>
                              <span>{Math.min(200, walletPts)}</span>
                            </div>
                            {newFazaForm.rewardPoints > walletPts && (
                              <p className="text-xs text-red-500 font-bold mt-2">⚠️ رصيدك غير كافٍ</p>
                            )}
                          </div>

                          {/* Urgency */}
                          <div>
                            <p className="text-xs font-black text-slate-500 mb-2">متى تحتاج الإجابة؟</p>
                            <div className="space-y-2">
                              {FAZA_URGENCY.map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => setNewFazaForm(p => ({ ...p, urgency: u.id }))}
                                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 text-right ${
                                    newFazaForm.urgency === u.id
                                      ? 'border-emerald-400 bg-emerald-50'
                                      : 'border-slate-100 bg-white'
                                  }`}
                                >
                                  <span className="text-xl">{u.emoji}</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-black text-slate-800">{u.label}</p>
                                    <p className="text-[10px] text-slate-400">{u.desc}</p>
                                  </div>
                                  {newFazaForm.urgency === u.id && (
                                    <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                                      <span className="text-white text-[10px]">✓</span>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Optional Photo */}
                          <div>
                            <p className="text-xs font-black text-slate-500 mb-2">صورة توضيحية (اختياري)</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder="رابط صورة توضيحية..."
                                  value={newFazaForm.photoUrl}
                                  onChange={e => setNewFazaForm(p => ({ ...p, photoUrl: e.target.value }))}
                                />
                              </div>
                              {newFazaForm.photoUrl && (
                                <img src={newFazaForm.photoUrl} className="w-12 h-12 rounded-xl object-cover border border-slate-200" onError={e => (e.currentTarget.style.display = 'none')} loading="lazy" />
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── Step 3: Preview & Post ───────────────── */}
                      {fazaWizardStep === 3 && (
                        <>
                          {/* Live preview card */}
                          <div>
                            <p className="text-xs font-black text-slate-500 mb-2 uppercase tracking-wider">كيف ستظهر فزعتك</p>
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <img
                                  src={newFazaForm.anonymous ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=anon' : (userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.id}`)}
                                  className="w-10 h-10 rounded-full border-2 border-emerald-100"
                                  loading="lazy"
                                />
                                <div className="flex-1">
                                  <p className="text-xs font-black text-slate-900">{newFazaForm.anonymous ? 'مجهول الهوية' : userProfile.name}</p>
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                    {urgencyOpt.emoji} {urgencyOpt.label}
                                    {selectedCat && <span className="mx-1">·</span>}
                                    {selectedCat && <span style={{ color: selectedCat.color }}>{selectedCat.emoji} {selectedCat.label}</span>}
                                  </p>
                                </div>
                                <div className="bg-orange-50 px-3 py-1 rounded-xl text-orange-600 text-xs font-black">
                                  +{newFazaForm.rewardPoints} كرم
                                </div>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                "{newFazaForm.question || 'سؤالك سيظهر هنا...'}"
                              </p>
                              {newFazaForm.photoUrl && (
                                <img src={newFazaForm.photoUrl} className="mt-3 w-full h-28 object-cover rounded-xl" onError={e => (e.currentTarget.style.display = 'none')} loading="lazy" />
                              )}
                            </div>
                          </div>

                          {/* Anonymous toggle */}
                          <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-black text-slate-800">🎭 نشر مجهول الهوية</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">لن يظهر اسمك للأعضاء</p>
                            </div>
                            <button
                              onClick={() => setNewFazaForm(p => ({ ...p, anonymous: !p.anonymous }))}
                              className={`w-12 h-7 rounded-full transition-all duration-300 relative ${newFazaForm.anonymous ? 'bg-emerald-600' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${newFazaForm.anonymous ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                          </div>

                          {/* Similar faza radar */}
                          {similarFaza.length > 0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                              <p className="text-xs font-black text-amber-700 mb-2 flex items-center gap-1">
                                🔍 أسئلة مشابهة موجودة
                              </p>
                              {similarFaza.map(sf => (
                                <div key={sf.id} className="text-xs text-amber-600 leading-relaxed mb-1">
                                  · "{sf.question.slice(0, 80)}{sf.question.length > 80 ? '...' : ''}"
                                </div>
                              ))}
                              <p className="text-[10px] text-amber-500 mt-1">تأكد أن سؤالك مختلف لتحصل على أفضل إجابة</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Fixed Footer */}
                    <div className="px-5 py-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                      {fazaWizardStep > 1 && (
                        <button
                          onClick={() => setFazaWizardStep(s => (s - 1) as 1 | 2 | 3)}
                          className="px-5 py-3.5 bg-slate-100 text-slate-600 font-black text-sm rounded-2xl active:scale-95 transition-transform"
                        >
                          ← رجوع
                        </button>
                      )}
                      <button
                        disabled={fazaSubmitting || (fazaWizardStep === 2 && newFazaForm.rewardPoints > walletPts)}
                        onClick={() => {
                          if (fazaWizardStep < 3) {
                            if (fazaWizardStep === 1 && !newFazaForm.question.trim()) {
                              setFazaErrors({ question: 'اكتب سؤالك أولاً' });
                              return;
                            }
                            setFazaWizardStep(s => (s + 1) as 1 | 2 | 3);
                          } else {
                            handleCreateFaza();
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-black text-sm py-3.5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {fazaSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : fazaWizardStep < 3 ? 'التالي →' : '🚀 أرسل الفزعة'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Faza'a Modal */}
        {showFazaModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-sm:max-w-xs p-8 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setShowFazaModal(null)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              <h3 className="font-black text-xl mb-2">تقديم فزعة لـ {showFazaModal.userName}</h3>
              <p className="text-xs text-slate-500 mb-6">ساعد غيرك واكسب {showFazaModal.pointsReward} نقطة كرم ورصيد محفظة.</p>
              <textarea className="w-full h-32 p-4 bg-slate-50 rounded-3xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500 mb-6" placeholder="اكتب نصيحتك هنا..." value={fazaAnswer} onChange={(e) => setFazaAnswer(e.target.value)} />
              <Button onClick={handleFazaSubmit} className="w-full py-4 font-black">إرسال الفزعة</Button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>
            <span className="font-black text-sm">{successMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-28 overflow-y-auto h-full bg-slate-50">
      {/* ── Main Tab Bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-6 pt-6 pb-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{t.tabCommunities || 'المجتمعات'}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              className="relative w-9 h-9 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center active:scale-90 transition-transform"
              onClick={() => setUnreadCount(0)}
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="bg-white px-3 py-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <WalletIcon className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-black text-slate-900">{(userProfile.walletBalance || 0).toFixed(2)} ر.س</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab('communities')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-2xl text-sm font-black transition-all border-b-2 ${mainTab === 'communities' ? 'border-emerald-600 text-emerald-600 bg-emerald-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <Users className="w-4 h-4" /> المجتمعات
          </button>
          <button
            onClick={() => setMainTab('traveling')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-2xl text-sm font-black transition-all border-b-2 ${mainTab === 'traveling' ? 'border-emerald-600 text-emerald-600 bg-emerald-50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {(t as any).travelingTogether || '🤝 Traveling Together'}
            {travelPosts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-full">{travelPosts.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── COMMUNITIES TAB ─────────────────────────────────────────────── */}
      {mainTab === 'communities' && (
        <div className="p-6 space-y-8">
          {/* Feature 12: Weekly Recap Digest */}
          {(() => {
            const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recapThreads = Object.values(threads).flat().filter((th: MajlisThread) => new Date(th.createdAt).getTime() > weekStart).length;
            const recapEvents = localEvents.filter(e => new Date(e.date).getTime() > weekStart - 7*24*3600*1000).length;
            const recapTrips = travelPosts.filter(p => p.timestamp > weekStart && p.userId !== userProfile.id).length;
            if (recapThreads + recapEvents + recapTrips === 0) return null;
            return (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5">
                <h3 className="font-black text-amber-800 text-sm mb-3">هذا الأسبوع في مجتمعاتك 📊</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center bg-white/60 rounded-2xl py-2.5">
                    <p className="text-2xl font-black text-amber-700">{recapThreads}</p>
                    <p className="text-[9px] font-bold text-amber-600">موضوع جديد</p>
                  </div>
                  <div className="flex-1 text-center bg-white/60 rounded-2xl py-2.5">
                    <p className="text-2xl font-black text-amber-700">{recapEvents}</p>
                    <p className="text-[9px] font-bold text-amber-600">فعالية</p>
                  </div>
                  <div className="flex-1 text-center bg-white/60 rounded-2xl py-2.5">
                    <p className="text-2xl font-black text-amber-700">{recapTrips}</p>
                    <p className="text-[9px] font-bold text-amber-600">رحلة جديدة</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-slate-900 rounded-[35px] p-6 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-lg">تقدّمك في الكرم</h3>
                  <p className="text-[10px] opacity-60 uppercase font-black tracking-widest">{userProfile.rank}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-black mb-1">
                  <span>الفزعات المنجزة: {userProfile.fazaCount || 0}</span>
                  <span>الهدف القادم: {(userProfile.fazaCount || 0) < 3 ? '3' : (userProfile.fazaCount || 0) < 10 ? '10' : 'ماستر'}</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.min(100, ((userProfile.fazaCount || 0) / ((userProfile.fazaCount || 0) < 3 ? 3 : 10)) * 100)}%` }} />
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-black">{userProfile.karamPoints || 0} نقطة</span>
                </div>
                <button className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-lg">سجل الفزعات</button>
              </div>
            </div>
            <Crown className="absolute -bottom-8 -right-8 w-40 h-40 text-white/5 rotate-12" />
          </div>

          <div>
            <h2 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> استكشف المجالس والمجتمعات
            </h2>

            {/* Feature 7: My Communities shelf */}
            {joinedCommunities.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">مجتمعاتي</p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {joinedCommunities.map(cid => {
                    const comm = communities.find(c => c.id === cid);
                    if (!comm) return null;
                    return (
                      <button
                        key={cid}
                        onClick={() => { setSelectedCommunity(comm); setActiveTab('majlis'); setSelectedThread(null); setShowCreateThread(false); }}
                        className="flex flex-col items-center gap-1 shrink-0 active:scale-95 transition-transform"
                      >
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-sm">
                          <img src={comm.image} className="w-full h-full object-cover" alt={comm.name} loading="lazy" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 text-center line-clamp-1 max-w-[60px]">{comm.name.replace(/[^\u0600-\u06FFA-Za-z0-9 ]/g, '').trim() || comm.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Feature 6: Community search bar */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 mb-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="ابحث في المجتمعات..."
                value={communitySearch}
                onChange={e => setCommunitySearch(e.target.value)}
              />
              {communitySearch && (
                <button onClick={() => setCommunitySearch('')} className="text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category filter chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
              {COMMUNITY_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${categoryFilter === cat ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              {filteredCommunities.length > 0 ? (
                filteredCommunities.map(renderCommunityCard)
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <h3 className="font-bold text-slate-600">لا توجد مجتمعات حالياً</h3>
                  <p className="text-xs text-slate-400 mt-1">اربط الواجهة بـ communityAPI لعرض المجالس هنا.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TRAVELING TOGETHER TAB ───────────────────────────────────────── */}
      {mainTab === 'traveling' && (
        <div className="p-6 space-y-4">
          {/* Header & Post Trip button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">{(t as any).ttFindCompanions || 'Find travel companions for your next micro-escape!'}</p>
            </div>
            <button
              onClick={() => setShowPostTripModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-black rounded-2xl shadow-md active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> {(t as any).ttPostTrip || 'Post a Trip'}
            </button>
          </div>

          {/* Smart match recommendation */}
          {travelPosts.length > 0 && (() => {
            const userInterests = userProfile.smartProfile?.interests || [];
            const recommended = travelPosts.find(p =>
              p.userId !== userProfile.id && !p.joinedByMe && p.interests.some(i => userInterests.includes(i))
            ) || travelPosts.find(p => p.userId !== userProfile.id && !p.joinedByMe);
            if (!recommended) return null;
            const spotsLeft = recommended.maxSize - recommended.groupSize;
            const isFull = spotsLeft <= 0;
            return (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span className="text-xs font-black text-emerald-700">موصى به لك</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <img src={recommended.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recommended.userId}`} className="w-9 h-9 rounded-full border-2 border-emerald-200" alt="" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm">{recommended.userName}</p>
                    <p className="text-xs text-emerald-700 font-bold truncate">📍 {recommended.placeName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${spotsLeft <= 2 && !isFull ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isFull ? 'مكتمل' : `${spotsLeft} متبقي`}
                    </p>
                  </div>
                </div>
                {recommended.description && <p className="text-xs text-slate-600 mb-3 line-clamp-2">{recommended.description}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinTrip(recommended.id)}
                    disabled={isFull || recommended.joinedByMe}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${recommended.joinedByMe ? 'bg-emerald-100 text-emerald-700' : isFull ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white active:scale-95'}`}
                  >
                    {recommended.joinedByMe ? '✅ انضممت' : isFull ? 'مكتمل' : '🤝 انضم الآن'}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Travel Posts Feed */}
          {travelPosts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-bold text-slate-600 mb-1">{(t as any).ttNoTrips || 'No trips posted yet'}</h3>
              <p className="text-xs text-slate-400 mb-4">{(t as any).ttBeFirst || 'Be the first to find travel companions!'}</p>
              <button
                onClick={() => setShowPostTripModal(true)}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-full"
              >
                {(t as any).ttPostYourTrip || 'Post Your Trip'}
              </button>
            </div>
          ) : travelPosts.map(post => {
            const spotsLeft = post.maxSize - post.groupSize;
            const isFull = spotsLeft <= 0;
            const isMyPost = post.userId === userProfile.id;
            return (
              <div key={post.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`}
                    className="w-10 h-10 rounded-full border-2 border-slate-100"
                    alt={post.userName}
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm">{post.userName}</p>
                    <p className="text-xs text-slate-500">{(t as any).ttIsHeadingTo || 'is heading to'} <span className="font-bold text-emerald-700">{post.placeName}</span></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {post.description && (
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{post.description}</p>
                )}

                {/* Interests + Feature 9: match score badge */}
                {post.interests.length > 0 && (() => {
                  const userInterests = userProfile.smartProfile?.interests || [];
                  const score = post.interests.length === 0 ? 0 : Math.round((post.interests.filter(i => userInterests.includes(i)).length / post.interests.length) * 100);
                  return (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1.5 relative">
                        {post.interests.map(i => {
                          const opt = INTEREST_KEYS.find(k => k.val === i);
                          return (
                            <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                              {opt ? ((t as any)[opt.tKey] || i) : i}
                            </span>
                          );
                        })}
                        {score > 0 && (
                          <span className={`ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${score === 100 ? 'bg-yellow-50 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {score === 100 ? '⭐ ' : ''}{score}% match
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Footer: group size + join */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(post.maxSize, 6) }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-5 rounded-full border-2 ${idx < post.groupSize ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-100 border-slate-200'}`}
                        />
                      ))}
                    </div>
                    {/* Spots left pill — red when ≤2 */}
                    {!isFull ? (
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${spotsLeft <= 2 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700'}`}>
                        {spotsLeft} {(t as any).ttLeft || 'left'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">مكتمل</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isMyPost && !isFull && !post.joinedByMe && (
                      <button
                        onClick={() => setChatDmPost(chatDmPost === post.id ? null : post.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 active:scale-95 transition-transform"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> رسالة
                      </button>
                    )}
                    {!isMyPost && (
                      <button
                        onClick={() => handleJoinTrip(post.id)}
                        disabled={isFull || post.joinedByMe}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all
                          ${post.joinedByMe
                            ? 'bg-emerald-50 text-emerald-700 cursor-default'
                            : isFull
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                          }`}
                      >
                        {post.joinedByMe ? <><CheckCircle2 className="w-3.5 h-3.5" /> {(t as any).ttJoined || 'Joined'}</> : isFull ? ((t as any).ttFull || 'Full') : <><UserPlus className="w-3.5 h-3.5" /> {(t as any).ttJoin || 'Join'}</>}
                      </button>
                    )}
                    {isMyPost && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl">{(t as any).ttYourPost || 'Your post'}</span>
                    )}
                  </div>
                </div>
                {/* Inline DM input */}
                {chatDmPost === post.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 animate-in slide-in-from-top duration-200">
                    <input
                      className="flex-1 bg-slate-50 rounded-full px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="أرسل رسالة للمنظم..."
                      value={dmInputs[post.id] || ''}
                      onChange={e => setDmInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && dmInputs[post.id]?.trim()) {
                          setSuccessMessage(lang === 'ar' ? 'تم إرسال رسالتك للمنظم! 📩' : 'Message sent to the organiser! 📩');
                          setDmInputs(prev => ({ ...prev, [post.id]: '' }));
                          setChatDmPost(null);
                          setTimeout(() => setSuccessMessage(null), 3000);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (dmInputs[post.id]?.trim()) {
                          setSuccessMessage(lang === 'ar' ? 'تم إرسال رسالتك للمنظم! 📩' : 'Message sent to the organiser! 📩');
                          setDmInputs(prev => ({ ...prev, [post.id]: '' }));
                          setChatDmPost(null);
                          setTimeout(() => setSuccessMessage(null), 3000);
                        }
                      }}
                      className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white shrink-0 active:scale-90 transition-transform"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Post a Trip Modal ────────────────────────────────────────────── */}
      {showPostTripModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPostTripModal(false)}
              className="absolute top-5 right-5 p-2 bg-slate-50 rounded-full"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <h3 className="font-black text-xl text-slate-900 mb-1">{(t as any).ttModalTitle || 'Post a Trip 🗺️'}</h3>
            <p className="text-xs text-slate-400 mb-5">{(t as any).ttModalSubtitle || 'Let others join your next micro-escape'}</p>

            <div className="space-y-4">
              {/* Place name */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttPlaceLabel || 'Place / Destination *'}</label>
                <input
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={(t as any).ttPlacePlaceholder || 'e.g. Al Bujairi Heritage Park'}
                  value={newTripPost.placeName}
                  onChange={e => setNewTripPost(p => ({ ...p, placeName: e.target.value }))}
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttDateLabel || 'Date *'}</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newTripPost.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setNewTripPost(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              {/* Max group size */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttGroupSizeLabel || 'Looking for (total group size)'}</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setNewTripPost(p => ({ ...p, maxSize: Math.max(2, p.maxSize - 1) }))}
                    className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 transition"
                  >
                    −
                  </button>
                  <span className="font-black text-lg text-slate-900 w-8 text-center">{newTripPost.maxSize}</span>
                  <button
                    onClick={() => setNewTripPost(p => ({ ...p, maxSize: Math.min(10, p.maxSize + 1) }))}
                    className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 transition"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400">{(t as any).ttPeopleTotal || 'people total'}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttDescLabel || 'Description'}</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder={(t as any).ttDescPlaceholder || 'Tell others about your plans...'}
                  value={newTripPost.description}
                  onChange={e => setNewTripPost(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              {/* Interests */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttInterestsLabel || 'Interests'}</label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_KEYS.map(opt => {
                    const active = newTripPost.interests.includes(opt.val);
                    return (
                      <button
                        key={opt.val}
                        onClick={() => setNewTripPost(p => ({
                          ...p,
                          interests: active
                            ? p.interests.filter(i => i !== opt.val)
                            : [...p.interests, opt.val]
                        }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-emerald-400'}`}
                      >
                        {(t as any)[opt.tKey] || opt.val}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handlePostTrip}
                disabled={!newTripPost.placeName.trim() || !newTripPost.date || isSubmitting}
                className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '...' : ((t as any).ttPostBtn || 'Post Trip 🤝')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
