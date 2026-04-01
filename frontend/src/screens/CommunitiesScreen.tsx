import React, { useState, useEffect, useRef } from 'react';
import { Users, ChevronRight, Trophy, Star, MessageSquare, Plus, Crown, Flame, CheckCircle2, Send, X, ShieldCheck, Heart, Calendar, Clock, MapPin, Wallet as WalletIcon, TrendingUp, Award, Search, Tag, ArrowLeft, Hash, MessageCircle, Handshake, UserPlus } from 'lucide-react';
import { Community, Itinerary, FazaRequest, ChatMessage, CommunityEvent, User, Place, MajlisThread } from '../types/index';
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
  const [activeTab, setActiveTab] = useState<'majlis' | 'requests' | 'events'>('majlis');

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

  // Thread state
  const [threads, setThreads] = useState<Record<string, MajlisThread[]>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_threads') || '{}'); } catch { return {}; }
  });
  const [threadSearch, setThreadSearch] = useState('');
  const [selectedThread, setSelectedThread] = useState<MajlisThread | null>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', body: '', tags: '' });
  const [replyText, setReplyText] = useState('');

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
    location: ''
  });

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
    setSuccessMessage(`كفو! حصلت على ${rewardPoints} نقطة كرم و ${cashReward} ريال في محفظتك.`);

    setTimeout(() => {
      setSuccessMessage(null);
      setShowFazaModal(null);
      setFazaAnswer('');
    }, 4500);
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date || !selectedCommunity) return;

    const event: CommunityEvent = {
      id: Date.now().toString(),
      communityId: selectedCommunity.id,
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time || '20:00',
      locationName: newEvent.location || 'الرياض',
      attendeesCount: 1,
      image: selectedCommunity.image
    };

    setLocalEvents([event, ...localEvents]);
    setShowCreateEventModal(false);
    setSuccessMessage("تم نشر الفعالية بنجاح! ننتظر الجميع 🚀");
    setNewEvent({ title: '', description: '', date: '', time: '', location: '' });
    setTimeout(() => setSuccessMessage(null), 3000);
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
    if (joinedEvents.includes(eventId)) {
      setJoinedEvents(joinedEvents.filter(id => id !== eventId));
      setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeesCount: e.attendeesCount - 1 } : e));
    } else {
      setJoinedEvents([...joinedEvents, eventId]);
      setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeesCount: e.attendeesCount + 1 } : e));
      setSuccessMessage("تم تسجيل اهتمامك بالفعالية! ننتظرك هناك 🤩");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // ── Travel Post handlers ──────────────────────────────────────────────────
  const handlePostTrip = () => {
    if (!newTripPost.placeName || !newTripPost.date) return;
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
    if (!newThread.title || !selectedCommunity) return;
    const thread: MajlisThread = {
      id: Date.now().toString(),
      communityId: selectedCommunity.id,
      title: newThread.title,
      body: newThread.body,
      authorName: userProfile.name,
      createdAt: new Date().toISOString(),
      tags: newThread.tags.split(',').map(t => t.trim()).filter(Boolean),
      replies: []
    };
    setThreads(prev => ({ ...prev, [selectedCommunity.id]: [thread, ...(prev[selectedCommunity.id] || [])] }));
    setShowCreateThread(false);
    setNewThread({ title: '', body: '', tags: '' });
    setSuccessMessage("تم نشر الموضوع بنجاح!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleReplyToThread = () => {
    if (!replyText.trim() || !selectedThread || !selectedCommunity) return;
    const reply = { id: Date.now().toString(), text: replyText, authorName: userProfile.name, createdAt: new Date().toISOString() };
    const updated = { ...selectedThread, replies: [...selectedThread.replies, reply] };
    setSelectedThread(updated);
    setThreads(prev => ({
      ...prev,
      [selectedCommunity.id]: (prev[selectedCommunity.id] || []).map(t => t.id === updated.id ? updated : t)
    }));
    setReplyText('');
  };

  const formatRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    return `منذ ${Math.floor(hrs / 24)} يوم`;
  };

  const renderCommunityCard = (comm: Community) => (
    <div
      key={comm.id}
      onClick={() => { setSelectedCommunity(comm); setActiveTab('majlis'); setSelectedThread(null); setShowCreateThread(false); }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 mb-4 active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="h-28 relative">
        <img src={comm.image} className="w-full h-full object-cover" alt={comm.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl bg-white/20 backdrop-blur-md w-10 h-10 rounded-xl flex items-center justify-center">{comm.icon}</span>
            <h3 className="text-lg font-bold">{comm.name}</h3>
          </div>
          <p className="text-[10px] font-bold opacity-90 px-2 py-1 bg-white/10 rounded-lg">{comm.memberCount} {t.commMembers || 'عضو'}</p>
        </div>
      </div>
    </div>
  );

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

    // Computed threads for current community with search filter
    const communityThreads = (threads[selectedCommunity?.id || ''] || []).filter(t =>
      !threadSearch || t.title.toLowerCase().includes(threadSearch.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(threadSearch.toLowerCase()))
    );

    // اقتراح أماكن للمجلس بناءً على تصنيف المجتمع والأماكن الحقيقية
    const suggestions = allPlaces.filter(p => {
      const placeCategory = p.categoryTags?.[0] || p.category || '';
      return placeCategory.toLowerCase().includes(selectedCommunity.category.toLowerCase());
    }).slice(0, 4);

    return (
      <div className="h-full flex flex-col bg-slate-50 animate-in slide-in-from-bottom duration-300">
        <div className="relative h-44 shrink-0">
          <img src={selectedCommunity.image} className="w-full h-full object-cover" />
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
            { id: 'requests', label: t.commFazaRequests || 'الفزعات', icon: ShieldCheck }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-4 text-xs font-black transition-all flex flex-col items-center gap-1 border-b-2 ${activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'}`}>
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
                      <p className="font-black text-slate-900 text-sm truncate">{selectedThread.title}</p>
                      <p className="text-[10px] text-slate-400">{selectedThread.replies.length} رد · {selectedThread.authorName}</p>
                    </div>
                  </div>

                  {/* Thread body + replies scroll area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Original post */}
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                      <h3 className="font-black text-slate-900 text-base mb-3 leading-snug">{selectedThread.title}</h3>
                      {selectedThread.body ? (
                        <p className="text-sm text-slate-700 leading-relaxed mb-4">{selectedThread.body}</p>
                      ) : null}
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

                  {/* Reply input */}
                  <div className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0">
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

                    <Button
                      onClick={handleCreateThread}
                      className="w-full py-4 font-black"
                      disabled={!newThread.title.trim()}
                    >
                      نشر الموضوع
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
                              <img src={p.photos?.[0] || p.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=200'} className="w-full h-14 rounded-xl object-cover mb-1 border border-slate-100" />
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
                          className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                        >
                          {/* Title */}
                          <h4 className="font-black text-slate-900 text-sm leading-snug mb-2">{thread.title}</h4>
                          {/* Body preview */}
                          {thread.body ? (
                            <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{thread.body}</p>
                          ) : null}
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
                ) : communityEvents.map(event => (
                  <div key={event.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
                    <div className="h-32 relative">
                      <img src={event.image} className="w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-white/90 px-2 py-1 rounded-lg text-xs font-bold text-emerald-600 flex items-center gap-1 rtl:right-3 rtl:left-auto">
                        <Calendar className="w-3 h-3" /> {event.date}
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded-lg text-[10px] text-white font-bold flex items-center gap-1 rtl:left-3 rtl:right-auto">
                        <Users className="w-3 h-3" /> {event.attendeesCount} خوي بيمشي
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-black text-slate-900 mb-1">{event.title}</h4>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">{event.description}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold mb-4">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.locationName}</span>
                      </div>
                      <Button
                        onClick={() => toggleJoinEvent(event.id)}
                        className={`w-full py-2.5 text-xs font-black ${joinedEvents.includes(event.id) ? 'bg-slate-100 text-slate-500 shadow-none' : ''}`}
                      >
                        {joinedEvents.includes(event.id) ? 'تم تسجيل الاهتمام ✅' : 'سجل اهتمامك'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="h-full overflow-y-auto p-4 space-y-6 pb-20">
              <section>
                {communityFaza.length === 0 ? (
                  <div className="text-center py-20 text-slate-300">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">كل الفزعات مكتملة حالياً في هذا المجتمع!</p>
                  </div>
                ) : communityFaza.map(req => (
                  <div key={req.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={req.userAvatar} className="w-10 h-10 rounded-full border-2 border-emerald-100" />
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
            </div>
          )}
        </div>

        {/* Create Event Modal */}
        {showCreateEventModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-sm:max-w-xs p-8 shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setShowCreateEventModal(false)} className="absolute top-6 right-6 p-2 bg-slate-50 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
              <h3 className="font-black text-xl mb-4">اقترح فعالية جديدة</h3>
              <div className="space-y-4">
                <Input label="اسم الفعالية" placeholder="مثال: تجمع بادل السبت" value={newEvent.title} onChange={(e: any) => setNewEvent({ ...newEvent, title: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="التاريخ" type="date" value={newEvent.date} onChange={(e: any) => setNewEvent({ ...newEvent, date: e.target.value })} />
                  <Input label="الوقت" type="time" value={newEvent.time} onChange={(e: any) => setNewEvent({ ...newEvent, time: e.target.value })} />
                </div>
                <Input label="الموقع" placeholder="مثال: ملاعب فور بادل" value={newEvent.location} onChange={(e: any) => setNewEvent({ ...newEvent, location: e.target.value })} />
                <textarea className="w-full h-24 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500" placeholder="وصف الفعالية..." value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                <Button onClick={handleCreateEvent} className="w-full py-4 font-black">نشر الفعالية</Button>
              </div>
            </div>
          </div>
        )}

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
          <div className="bg-white px-3 py-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <WalletIcon className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-black text-slate-900">{(userProfile.walletBalance || 0).toFixed(2)} ر.س</p>
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
            <h2 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> استكشف المجالس والمجتمعات
            </h2>
            <div className="grid gap-2">
              {communities.length > 0 ? (
                communities.map(renderCommunityCard)
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

                {/* Interests */}
                {post.interests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.interests.map(i => {
                      const opt = INTEREST_KEYS.find(k => k.val === i);
                      return (
                      <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                        {opt ? ((t as any)[opt.tKey] || i) : i}
                      </span>
                      );
                    })}
                  </div>
                )}

                {/* Footer: group size + join */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: post.maxSize }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-5 rounded-full border-2 ${idx < post.groupSize ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-100 border-slate-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 font-bold">
                      {post.groupSize}/{post.maxSize} {(t as any).ttSpots || 'spots'}
                      {!isFull && <span className="text-emerald-600"> · {spotsLeft} {(t as any).ttLeft || 'left'}</span>}
                    </span>
                  </div>
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
                disabled={!newTripPost.placeName.trim() || !newTripPost.date}
                className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(t as any).ttPostBtn || 'Post Trip 🤝'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
