import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, ChevronRight, Trophy, Star, MessageSquare, Plus, Crown, Flame, CheckCircle2, Send, X, ShieldCheck, Heart, Calendar, Clock, MapPin, Wallet as WalletIcon, TrendingUp, Award, Search, Tag, ArrowLeft, Hash, MessageCircle, Handshake, UserPlus, Bell, Globe, ExternalLink, Info, Image } from 'lucide-react';
import { Community, Itinerary, FazaRequest, ChatMessage, CommunityEvent, User, Place, MajlisThread } from '../types/index';
import { Button, Input, Badge, SafeImage } from '../components/ui';
import { placeAPI, communityAPI, authAPI, threadAPI, eventAPI, fazaAPI, travelPostAPI } from '../services/api';

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
  { id: 'sports', label: 'رياضة', emoji: '⚽' },
  { id: 'food', label: 'أكل وشرب', emoji: '🍽️' },
  { id: 'hiking', label: 'رحلات', emoji: '🏔️' },
  { id: 'cultural', label: 'ثقافي', emoji: '🎭' },
  { id: 'social', label: 'تجمع', emoji: '👥' },
  { id: 'gaming', label: 'ألعاب', emoji: '🎮' },
  { id: 'art', label: 'فن', emoji: '🎨' },
  { id: 'other', label: 'أخرى', emoji: '✨' },
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
  { id: 'once', label: 'مرة واحدة' },
  { id: 'weekly', label: 'أسبوعياً' },
  { id: 'monthly', label: 'شهرياً' },
] as const;

const FAZA_CATEGORIES = [
  { id: 'recommendation', label: 'توصية', emoji: '📍', color: '#6366f1' },
  { id: 'advice', label: 'نصيحة', emoji: '💡', color: '#f59e0b' },
  { id: 'planning', label: 'تخطيط', emoji: '🗺️', color: '#10b981' },
  { id: 'emergency', label: 'طارئ', emoji: '🚨', color: '#ef4444' },
  { id: 'general', label: 'استفسار', emoji: '💬', color: '#8b5cf6' },
  { id: 'transport', label: 'مواصلات', emoji: '🚗', color: '#0ea5e9' },
  { id: 'food', label: 'أكل', emoji: '🍽️', color: '#f97316' },
  { id: 'gear', label: 'معدات', emoji: '🎒', color: '#64748b' },
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
  { id: 'today', label: 'اليوم', emoji: '🔴', desc: 'أحتاج رد سريع' },
  { id: 'week', label: 'هذا الأسبوع', emoji: '🟡', desc: 'ما في ضغط كبير' },
  { id: 'anytime', label: 'في أي وقت', emoji: '🟢', desc: 'مو مستعجل' },
] as const;

interface TravelPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  placeName: string;
  placeId?: string;
  date: string;
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

const COMMUNITY_CATEGORIES = ['الكل', 'Sports', 'Food', 'Nature', 'Cars', 'Women', 'Men', 'Sea'];

export const CommunitiesScreen = ({ t, lang, onOpenItinerary, initialCommunityId, onCommunityOpened }: { t: any, lang: string, onOpenItinerary: (it: Itinerary) => void, initialCommunityId?: string, onCommunityOpened?: () => void }) => {
  const ar = lang === 'ar';
  // ── Anti-Gravity State (Real Data) ──────────────────────────────────────
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [localEvents, setLocalEvents] = useState<CommunityEvent[]>([]);
  const [localFazaRequests, setLocalFazaRequests] = useState<FazaRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [activeTab, setActiveTab] = useState<'majlis' | 'requests' | 'events' | 'about'>('majlis');

  const [mainTab, setMainTab] = useState<'communities' | 'traveling'>('communities');
  const [travelPosts, setTravelPosts] = useState<TravelPost[]>([]);


  const [showPostTripModal, setShowPostTripModal] = useState(false);
  const [newTripPost, setNewTripPost] = useState({ placeName: '', date: '', maxSize: 4, description: '', interests: [] as string[] });
  const [showFazaModal, setShowFazaModal] = useState<FazaRequest | null>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [fazaAnswer, setFazaAnswer] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [joinedEvents, setJoinedEvents] = useState<string[]>([]);
  const [apiLoaded, setApiLoaded] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState('الكل');

  const [unreadCount, setUnreadCount] = useState(0);
  const [chatDmPost, setChatDmPost] = useState<string | null>(null);
  const [dmInputs, setDmInputs] = useState<Record<string, string>>({});

  // ── NEW SERVER STATE ──
  const [serverThreads, setServerThreads] = useState<MajlisThread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  useEffect(() => {
    if (selectedCommunity && activeTab === 'majlis') {
      const fetchThreads = async () => {
        setIsLoadingThreads(true);
        try {
          const data = await threadAPI.getThreads((selectedCommunity as any).id || (selectedCommunity as any)._id);
          setServerThreads(data as MajlisThread[]);
        } catch (err) {
          console.error("Failed to load threads", err);
        } finally {
          setIsLoadingThreads(false);
        }
      };
      fetchThreads();
    }
  }, [selectedCommunity, activeTab]);
  const [threadSearch, setThreadSearch] = useState('');
  const [selectedThread, setSelectedThread] = useState<MajlisThread | null>(null);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', body: '', tags: '' });
  const [replyText, setReplyText] = useState('');
  const [threadSort, setThreadSort] = useState<'latest' | 'replies' | 'reactions' | 'trending'>('latest');
  const [subscribedCommunities, setSubscribedCommunities] = useState<string[]>([]);
  const [newThreadImageUrl, setNewThreadImageUrl] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [showReplyImageInput, setShowReplyImageInput] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [completedFaza, setCompletedFaza] = useState<Array<{ id: string; question: string; pointsEarned: number; answeredAt: string; helperName: string }>>([]);
  const [newPoll, setNewPoll] = useState({ enabled: false, question: '', options: ['', ''] });

  //جلب البيانات من السيرفر
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const [
          userRes,
          placesRes,
          communitiesRes,
          eventsRes,
          fazaRes
        ] = await Promise.allSettled([
          token ? authAPI.getMe() : Promise.reject('no token'),
          placeAPI.getPlaces(),
          communityAPI.getCommunities(),
          eventAPI.getEvents(),
          fazaAPI.getRequests()
        ]);

        if (userRes.status === 'fulfilled') setUserProfile(userRes.value);
        if (placesRes.status === 'fulfilled') setAllPlaces(Array.isArray(placesRes.value) ? placesRes.value : []);

        if (communitiesRes.status === 'fulfilled') {
          const fetchedCommunities = Array.isArray(communitiesRes.value) ? communitiesRes.value : [];
          setCommunities(fetchedCommunities);
          if (initialCommunityId) {
            const target = fetchedCommunities.find(c => c.id === initialCommunityId || (c as any)._id === initialCommunityId);
            if (target) {
              setSelectedCommunity(target);
              onCommunityOpened?.();
            }
          }
        }
        if (eventsRes.status === 'fulfilled') setLocalEvents(Array.isArray(eventsRes.value) ? eventsRes.value : []);
        if (fazaRes.status === 'fulfilled') setLocalFazaRequests(Array.isArray(fazaRes.value) ? fazaRes.value : []);

        // Sync joined communities, subscriptions, events, travel posts from API
        if (token) {
          const [joinedCommRes, subscribedCommRes, joinedEvtRes, postsRes] = await Promise.allSettled([
            communityAPI.getJoinedCommunityIds(),
            communityAPI.getSubscribedCommunityIds(),
            eventAPI.getJoinedEventIds(),
            travelPostAPI.getPosts(),
          ]);
          if (joinedCommRes.status === 'fulfilled') {
            setJoinedCommunities(joinedCommRes.value);
          }
          if (subscribedCommRes.status === 'fulfilled') {
            setSubscribedCommunities(subscribedCommRes.value);
          }
          if (joinedEvtRes.status === 'fulfilled') {
            setJoinedEvents(joinedEvtRes.value);
          }
          if (postsRes.status === 'fulfilled') {
            const posts = Array.isArray(postsRes.value) ? postsRes.value : [];
            const mapped: TravelPost[] = posts.map((p: any) => ({
              id: p._id ?? p.id,
              userId: p.authorId ?? '',
              userName: p.authorName ?? (ar ? 'مسافر' : 'Traveller'),
              userAvatar: p.userAvatar,
              placeName: p.placeName ?? '',
              date: p.date ?? '',
              groupSize: p.joinedBy?.length ?? p.groupSize ?? 1,
              maxSize: p.maxSize ?? 4,
              description: p.description ?? '',
              interests: p.interests ?? [],
              timestamp: p.createdAt ? +new Date(p.createdAt) : Date.now(),
              joinedByMe: Array.isArray(p.joinedBy) && p.joinedBy.includes(userRes.status === 'fulfilled' ? (userRes.value as any)._id ?? (userRes.value as any).id : ''),
            }));
          }
          setApiLoaded(true);
        }

      } catch (error) {
        console.error("Antigravity engine failed to load some data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRealData();
  }, [initialCommunityId]);

  // Event Wizard State
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', endTime: '', location: '', mapUrl: '', category: '', coverPreset: 0, maxAttendees: '', minAttendees: '', recurrence: 'once' as 'once' | 'weekly' | 'monthly', isFree: true, fee: '', requirements: [] as string[], organizerNote: '', status: 'published' as 'draft' | 'published' });
  const [newReqText, setNewReqText] = useState('');
  const [eventErrors, setEventErrors] = useState<Record<string, string>>({});
  const [eventTouched, setEventTouched] = useState<Record<string, boolean>>({});
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Faza Wizard State
  const [showCreateFazaModal, setShowCreateFazaModal] = useState(false);
  const [fazaWizardStep, setFazaWizardStep] = useState<1 | 2 | 3>(1);
  const [fazaSubmitSuccess, setFazaSubmitSuccess] = useState(false);
  const [fazaSubmitting, setFazaSubmitting] = useState(false);
  const [newFazaForm, setNewFazaForm] = useState({ question: '', category: '', urgency: 'anytime' as 'today' | 'week' | 'anytime', rewardPoints: 50, photoUrl: '', anonymous: false });
  const [fazaErrors, setFazaErrors] = useState<Record<string, string>>({});

  const [communityMessages, setCommunityMessages] = useState<Record<string, ChatMessage[]>>(() => {
    try { return JSON.parse(localStorage.getItem('tripo_community_messages') || '{}'); } catch { return {}; }
  });
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('tripo_community_messages', JSON.stringify(communityMessages)); }, [communityMessages]);
  useEffect(() => {
    if (activeTab === 'majlis' && selectedThread) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, selectedThread, communityMessages]);



  const handleFazaSubmit = async () => {
    if (!fazaAnswer.trim() || !showFazaModal || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await communityAPI.answerFaza(showFazaModal.id, fazaAnswer);
      const { pointsEarned, cashEarned, newTripoPoints, newWalletBalance, newRank } = response;

      setUserProfile(prev => prev ? ({
        ...prev,
        karamPoints: newTripoPoints,
        walletBalance: newWalletBalance,
        rank: newRank,
      }) : prev);

      setLocalFazaRequests(prev => prev.filter(r => r.id !== showFazaModal.id));
      setCompletedFaza(prev => [{ id: showFazaModal.id, question: showFazaModal.question, pointsEarned, answeredAt: new Date().toISOString(), helperName: userProfile!.name }, ...prev]);
      setSuccessMessage(lang === 'ar' ? `كفو! حصلت على ${pointsEarned} نقطة كرم و ${cashEarned} ريال في محفظتك.` : `Well done! You earned ${pointsEarned} Karam points and ${cashEarned} SAR.`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSuccessMessage(null);
        setShowFazaModal(null);
        setFazaAnswer('');
      }, 4500);
    }
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

  const handleCreateEvent = async () => {
    const errs = validateEventForm();
    const allTouched = { title: true, date: true, time: true, category: true, fee: true, minAttendees: true };
    setEventErrors(errs);
    setEventTouched(allTouched);
    if (Object.keys(errs).length > 0 || !selectedCommunity || isSubmitting) return;
    setIsSubmitting(true);

    const eventPayload = {
      communityId: (selectedCommunity as any)._id ?? selectedCommunity.id,
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time || '20:00',
      endTime: newEvent.endTime || undefined,
      locationName: newEvent.location || 'الرياض',
      mapUrl: newEvent.mapUrl || undefined,
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

    // Optimistic Update
    const optimisticEvent: ExtendedCommunityEvent = {
      ...eventPayload,
      id: Date.now().toString(),
      attendeesCount: 1,
      image: selectedCommunity.image,
    } as ExtendedCommunityEvent;

    setLocalEvents([optimisticEvent, ...localEvents]);
    setShowCreateEventModal(false);

    try {
      const saved = await communityAPI.createEvent(eventPayload);
      const serverId = saved.data?._id ?? saved.data?.id ?? saved._id ?? saved.id;
      if (serverId) {
        setLocalEvents(prev => prev.map(e => e.id === optimisticEvent.id ? { ...e, id: serverId } : e));
      }
      const isDraft = newEvent.status === 'draft';
      setSuccessMessage(isDraft ? 'تم حفظ المسودة ✅' : (lang === 'ar' ? 'تم نشر الفعالية بنجاح! ننتظر الجميع ' : "Event published! Everyone's invited "));
    } catch {
      // Revert optimistic update? Or keep it if failed? Let's just keep it simple
    }

    setNewEvent({ title: '', description: '', date: '', time: '', endTime: '', location: '', mapUrl: '', category: '', coverPreset: 0, maxAttendees: '', minAttendees: '', recurrence: 'once', isFree: true, fee: '', requirements: [], organizerNote: '', status: 'published' });
    setNewReqText(''); setEventErrors({}); setEventTouched({}); setWizardStep(1);
    setIsSubmitting(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateFaza = async () => {
    if (!newFazaForm.question.trim() || !selectedCommunity || fazaSubmitting) return;
    setFazaSubmitting(true);
    const communityId = (selectedCommunity as any)._id ?? selectedCommunity.id;
    const optimisticReq: FazaRequest = {
      id: Date.now().toString(),
      userId: (userProfile as any)?._id ?? userProfile?.id ?? '',
      userName: newFazaForm.anonymous ? 'مجهول الهوية' : (userProfile?.name ?? ''),
      userAvatar: newFazaForm.anonymous
        ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=anon'
        : (userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(userProfile as any)?._id ?? userProfile?.id}`),
      question: newFazaForm.question.trim(),
      communityId,
      timestamp: Date.now(),
      pointsReward: newFazaForm.rewardPoints,
    };
    setLocalFazaRequests(prev => [optimisticReq, ...prev]);
    setUserProfile(prev => prev ? ({ ...prev, karamPoints: Math.max(0, (prev.karamPoints || 0) - newFazaForm.rewardPoints) }) : prev);
    try {
      const saved = await communityAPI.createFazaRequest({
        question: optimisticReq.question,
        communityId,
        category: newFazaForm.category || 'general',
        urgency: newFazaForm.urgency,
        rewardPoints: newFazaForm.rewardPoints,
        anonymous: newFazaForm.anonymous,
      });
      const serverId = saved.data?._id ?? saved.data?.id ?? saved._id ?? saved.id;
      if (serverId) {
        setLocalFazaRequests(prev => prev.map(r => r.id === optimisticReq.id ? { ...r, id: serverId } : r));
      }
    } catch {
      // keep optimistic version
    }
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

  const toggleJoinEvent = async (eventId: string) => {
    const evt = localEvents.find(e => e.id === eventId || (e as any)._id === eventId) as ExtendedCommunityEvent | undefined;
    const isJoined = joinedEvents.includes(eventId);
    if (isJoined) {
      setJoinedEvents(joinedEvents.filter(id => id !== eventId));
      setLocalEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendeesCount: Math.max(0, e.attendeesCount - 1) } : e));
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
    try { await communityAPI.toggleJoinEvent(eventId); } catch {
      // revert
      if (isJoined) setJoinedEvents(prev => [...prev, eventId]);
      else setJoinedEvents(prev => prev.filter(id => id !== eventId));
    }
  };

  const handlePostTrip = async () => {
    if (!newTripPost.placeName || !newTripPost.date || isSubmitting) return;
    setIsSubmitting(true);
    const optimisticPost: TravelPost = {
      id: Date.now().toString(),
      userId: (userProfile as any)._id ?? userProfile?.id ?? '',
      userName: userProfile?.name ?? (ar ? 'مسافر' : 'Traveller'),
      userAvatar: userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${(userProfile as any)?._id ?? userProfile?.id}`,
      placeName: newTripPost.placeName,
      date: newTripPost.date,
      groupSize: 1,
      maxSize: newTripPost.maxSize,
      description: newTripPost.description,
      interests: newTripPost.interests,
      timestamp: Date.now(),
    };
    setTravelPosts(prev => [optimisticPost, ...prev]);
    setShowPostTripModal(false);
    setNewTripPost({ placeName: '', date: '', maxSize: 4, description: '', interests: [] });
    setSuccessMessage("Trip posted! Looking forward to meeting fellow travelers 🤝");
    setTimeout(() => setSuccessMessage(null), 3000);
    try {
      const saved = await travelPostAPI.createPost({
        placeName: optimisticPost.placeName,
        date: optimisticPost.date,
        maxGroupSize: optimisticPost.maxSize,
        description: optimisticPost.description,
        interests: optimisticPost.interests,
        communityId: selectedCommunity ? ((selectedCommunity as any)._id ?? selectedCommunity.id) : undefined,
      });
      const serverPost: TravelPost = {
        ...optimisticPost,
        id: (saved.data?._id ?? saved.data?.id ?? saved._id ?? saved.id) || optimisticPost.id,
      };
      setTravelPosts(prev => prev.map(p => p.id === optimisticPost.id ? serverPost : p));
    } catch {
      // keep optimistic version
    }
    setIsSubmitting(false);
  };

  const handleJoinTrip = async (postId: string) => {
    setTravelPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      if (p.joinedByMe) return p;
      return { ...p, groupSize: p.groupSize + 1, joinedByMe: true };
    }));
    setSuccessMessage("You're in! 🎉 Have a great trip!");
    setTimeout(() => setSuccessMessage(null), 3000);
    try { await travelPostAPI.joinPost(postId); } catch {
      setTravelPosts(prev => prev.map(p => p.id === postId ? { ...p, groupSize: Math.max(1, p.groupSize - 1), joinedByMe: false } : p));
    }
  };

  const handleCreateThread = async () => {
    if (!newThread.title || !selectedCommunity || isSubmitting) return;
    setIsSubmitting(true);

    const payload = {
      title: newThread.title,
      body: newThread.body,
      tags: newThread.tags.split(',').map(t => t.trim()).filter(Boolean),
      imageUrl: newThreadImageUrl.trim() || undefined,
      poll: (newPoll.enabled && newPoll.question && newPoll.options.filter(Boolean).length >= 2)
        ? { question: newPoll.question, options: newPoll.options.filter(Boolean) }
        : undefined,
    };

    try {
      const communityId = (selectedCommunity as any).id || (selectedCommunity as any)._id;
      const createdThread = await threadAPI.createThread({ communityId, ...payload });
      setServerThreads(prev => [createdThread, ...prev]);

      setShowCreateThread(false);
      setNewThread({ title: '', body: '', tags: '' });
      setNewThreadImageUrl('');
      setNewPoll({ enabled: false, question: '', options: ['', ''] });
      setSuccessMessage(lang === 'ar' ? "تم نشر الموضوع بنجاح!" : "Thread published successfully!");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleReplyToThread = async () => {
    if (!replyText.trim() || !selectedThread || !selectedCommunity) return;

    const communityId = (selectedCommunity as any).id || (selectedCommunity as any)._id;
    // Optimistic Update
    const optimisticReply = { id: Date.now().toString(), text: replyText, authorId: userProfile.id, authorName: userProfile.name, createdAt: new Date().toISOString(), imageUrl: replyImageUrl.trim() || undefined };

    setSelectedThread(prev => prev ? { ...prev, replies: [...prev.replies, optimisticReply as any] } : prev);
    setServerThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, replies: [...t.replies, optimisticReply as any] } : t));

    const currentText = replyText;
    const currentImg = replyImageUrl;
    setReplyText('');
    setReplyImageUrl('');
    setShowReplyImageInput(false);

    try {
      const updatedThread = await threadAPI.replyToThread(selectedThread.id, currentText, currentImg);
      setSelectedThread(updatedThread);
      setServerThreads(prev => prev.map(t => t.id === updatedThread.id ? updatedThread : t));
    } catch (error) {
      console.error("Failed to reply", error);
    }
  };

  const handleTogglePin = async (threadId: string) => {
    if (!selectedCommunity) return;
    const communityId = (selectedCommunity as any).id || (selectedCommunity as any)._id;
    // Optimistic
    setServerThreads(prev => prev.map(t => t.id === threadId ? { ...t, pinned: !t.pinned } : t));
    setSelectedThread(prev => prev && prev.id === threadId ? { ...prev, pinned: !prev.pinned } : prev);

    try {
      await threadAPI.togglePin(threadId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleVotePoll = async (threadId: string, optionIdx: number) => {
    if (!selectedCommunity) return;
    const communityId = (selectedCommunity as any).id || (selectedCommunity as any)._id;

    // Optimistic update
    const updatePoll = (t: MajlisThread) => {
      if (t.id !== threadId || !t.poll) return t;
      return { ...t, poll: { ...t.poll, votes: { ...t.poll.votes, [userProfile.id]: optionIdx } } };
    };
    setServerThreads(prev => prev.map(updatePoll));
    setSelectedThread(prev => prev ? updatePoll(prev) : prev);

    // Background Sync
    try {
      await threadAPI.votePoll(threadId, optionIdx);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReaction = async (threadId: string, emoji: string) => {
    if (!selectedCommunity) return;
    const communityId = (selectedCommunity as any).id || (selectedCommunity as any)._id;

    // 1. Optimistic Update (UI feels instant)
    setServerThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      const currentReactions = t.reactions?.[emoji] || [];
      const hasReacted = currentReactions.includes(userProfile.id);
      const newReactions = hasReacted
        ? currentReactions.filter((id: string) => id !== userProfile.id)
        : [...currentReactions, userProfile.id];

      return { ...t, reactions: { ...t.reactions, [emoji]: newReactions } };
    }));

    // Update selected thread if it's open
    setSelectedThread(prev => {
      if (!prev || prev.id !== threadId) return prev;
      const currentReactions = prev.reactions?.[emoji] || [];
      const hasReacted = currentReactions.includes(userProfile.id);
      const newReactions = hasReacted
        ? currentReactions.filter((id: string) => id !== userProfile.id)
        : [...currentReactions, userProfile.id];
      return { ...prev, reactions: { ...prev.reactions, [emoji]: newReactions } };
    });

    // 2. Background Sync
    try {
      await threadAPI.toggleReaction(threadId, emoji);
    } catch (err) {
      console.error(err);
    }
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

  if (isLoading || !userProfile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-midnight text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-white dark:bg-chamber rounded-[2.5rem] flex items-center justify-center mb-8 shadow-mint-glow/5 border border-slate-100 dark:border-white/10 animate-pulse">
          <div className="w-10 h-10 border-4 border-oasis-spring border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tight">جارٍ تجهيز المجالس...</h2>
        <p className="text-[11px] text-slate-400 dark:text-moon/40 uppercase font-black tracking-[0.3em]">نربطك بمجتمعك المحلي</p>
      </div>
    );
  }

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
        <SafeImage src={comm.image} className="absolute inset-0 w-full h-full object-cover" alt={comm.name} fallbackType="placeholder" seed={comm.id} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {isTrending && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md z-10">
            <Flame className="w-3 h-3" /> رائج
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <button
            onClick={async e => {
              e.stopPropagation();
              const commId = (comm as any)._id ?? comm.id;
              setSubscribedCommunities(prev => isSubscribed ? prev.filter(id => id !== commId) : [...prev, commId]);
              try {
                if (isSubscribed) await communityAPI.unsubscribeCommunity(commId);
                else await communityAPI.subscribeCommunity(commId);
              } catch {
                setSubscribedCommunities(prev => isSubscribed ? [...prev, commId] : prev.filter(id => id !== commId));
              }
            }}
            className="w-7 h-7 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full"
          >
            <Bell className={`w-3.5 h-3.5 ${isSubscribed ? 'text-oasis-spring fill-oasis-spring' : 'text-white/60'}`} />
          </button>
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-oasis-spring rounded-full animate-pulse" />
            نشط
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex items-end justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg bg-white dark:bg-chamber/40 backdrop-blur-md w-8 h-8 rounded-xl flex items-center justify-center shrink-0">{comm.icon}</span>
                <h3 className="text-base font-black text-white leading-tight truncate">{comm.name}</h3>
              </div>
              <p className="text-[10px] text-white/70 font-bold">{comm.memberCount.toLocaleString()} {t.commMembers || 'عضو'}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
              <div className="flex items-center">
                {memberSeeds.map((seed, i) => (
                  <SafeImage
                    key={seed}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                    className="w-7 h-7 rounded-full border-2 border-white/60 bg-white dark:bg-chamber object-cover"
                    style={{ marginLeft: i > 0 ? -10 : 0 }}
                    alt=""
                    fallbackType="icon"
                  />
                ))}
              </div>
              <button
                onClick={async e => {
                  e.stopPropagation();
                  const commId = (comm as any)._id ?? comm.id;
                  setJoinedCommunities(prev => isJoined ? prev.filter(id => id !== commId) : [...prev, commId]);
                  try {
                    if (isJoined) await communityAPI.leaveCommunity(commId);
                    else await communityAPI.joinCommunity(commId);
                  } catch {
                    setJoinedCommunities(prev => isJoined ? [...prev, commId] : prev.filter(id => id !== commId));
                  }
                }}
                className={`text-[9px] font-black px-2.5 py-1 rounded-full transition-all ${isJoined ? 'bg-oasis-spring text-midnight' : 'bg-white/20 dark:bg-chamber/40 text-white backdrop-blur-sm'}`}
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

    let communityThreadsList = serverThreads.filter(t =>
      !threadSearch || t.title.toLowerCase().includes(threadSearch.toLowerCase()) ||
      t.tags.some(tag => tag.toLowerCase().includes(threadSearch.toLowerCase()))
    );
    if (threadSort === 'replies') {
      communityThreadsList = [...communityThreadsList].sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));
    } else if (threadSort === 'reactions') {
      communityThreadsList = [...communityThreadsList].sort((a, b) => {
        const rA = Object.values(a.reactions || {}).reduce((s: number, u: any) => s + (u?.length || 0), 0) as number;
        const rB = Object.values(b.reactions || {}).reduce((s: number, u: any) => s + (u?.length || 0), 0) as number;
        return rB - rA;
      });
    } else if (threadSort === 'trending') {
      communityThreadsList = [...communityThreadsList].sort((a, b) => {
        const ageA = Math.max(1, (Date.now() - new Date(a.createdAt).getTime()) / 3600000);
        const ageB = Math.max(1, (Date.now() - new Date(b.createdAt).getTime()) / 3600000);
        const scoreA = ((a.replies?.length || 0) + Object.values(a.reactions || {}).reduce((s: number, u: any) => s + u.length, 0)) / ageA;
        const scoreB = ((b.replies?.length || 0) + Object.values(b.reactions || {}).reduce((s: number, u: any) => s + u.length, 0)) / ageB;
        return scoreB - scoreA;
      });
    } else {
      communityThreadsList = [...communityThreadsList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const communityThreads = [...communityThreadsList.filter(t => t.pinned), ...communityThreadsList.filter(t => !t.pinned)];

    const suggestions = allPlaces.filter(p => {
      const placeCategory = p.categoryTags?.[0] || p.category || '';
      return placeCategory.toLowerCase().includes(selectedCommunity.category.toLowerCase());
    }).slice(0, 4);

    return (
      <div className="h-full flex flex-col bg-slate-50 dark:bg-midnight animate-in slide-in-from-bottom duration-300">
        <div className="relative h-44 shrink-0">
          <SafeImage src={selectedCommunity.image} className="w-full h-full object-cover" fallbackType="placeholder" seed={selectedCommunity.id} />
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
              <Badge color="orange" className="px-3 py-1 bg-amber-500 text-midnight border-none shadow-lg shadow-amber-500/20">
                <Award className="w-3 h-3 inline mr-1" /> {userProfile.rank}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex bg-white dark:bg-chamber border-b border-slate-100 dark:border-white/5 shadow-sm dark:shadow-black/30 sticky top-0 z-20">
          {[
            { id: 'majlis', label: t.commMajlis || 'المجلس', icon: MessageSquare },
            { id: 'events', label: 'الفعاليات', icon: Calendar },
            { id: 'requests', label: t.commFazaRequests || 'الفزعات', icon: ShieldCheck },
            { id: 'about', label: 'عن المجتمع', icon: Info }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 text-[10px] font-black transition-all flex flex-col items-center gap-1 border-b-2 ${activeTab === tab.id ? 'border-oasis-spring text-oasis-spring' : 'border-transparent text-slate-400 dark:text-moon/60'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'majlis' && (
            <div className="h-full flex flex-col">
              {selectedThread ? (
                <div className="h-full flex flex-col">
                  <div className="bg-white dark:bg-chamber border-b border-slate-100 dark:border-white/5 px-4 py-3 flex items-center gap-3 shrink-0">
                    <button onClick={() => setSelectedThread(null)} className="w-9 h-9 bg-slate-50 dark:bg-lifted rounded-full flex items-center justify-center text-slate-600 dark:text-moon/60 active:scale-90 transition-transform">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 dark:text-white text-sm truncate">{selectedThread.pinned ? '📌 ' : ''}{selectedThread.title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-moon/40">{selectedThread.replies.length} رد · {selectedThread.authorName}</p>
                    </div>
                    {selectedThread.authorName === userProfile.name && (
                      <button onClick={() => handleTogglePin(selectedThread.id)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 ${selectedThread.pinned ? 'bg-oasis-spring/10 text-oasis-spring' : 'bg-slate-50 dark:bg-lifted text-slate-400 dark:text-moon/40'}`} title={selectedThread.pinned ? 'إلغاء التثبيت' : 'تثبيت الموضوع'}>
                        <span className="text-base">{selectedThread.pinned ? '📌' : '📍'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="bg-white dark:bg-chamber rounded-3xl p-5 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-black/30">
                      <h3 className="font-black text-slate-900 dark:text-white text-base mb-3 leading-snug">{selectedThread.title}</h3>
                      {selectedThread.imageUrl && (
                        <SafeImage src={selectedThread.imageUrl} className="w-full rounded-2xl object-cover max-h-64 mb-3" alt="" fallbackType="placeholder" seed={selectedThread.id} />
                      )}
                      {selectedThread.body ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">{selectedThread.body}</p>
                      ) : null}
                      {!selectedThread.imageUrl && (() => {
                        const url = extractFirstUrl(selectedThread.body); return url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/5 rounded-xl px-3 py-2 mt-1 mb-2 text-xs text-slate-600 dark:text-moon/40 hover:bg-slate-100 dark:hover:bg-moon/5 transition">
                            <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-moon/20 flex-shrink-0" />
                            <span className="truncate font-medium">{urlDomain(url)}</span>
                            <ExternalLink className="w-3 h-3 text-slate-300 flex-shrink-0 ml-auto" />
                          </a>
                        ) : null;
                      })()}
                      {selectedThread.poll && (() => {
                        const poll = selectedThread.poll!;
                        const totalVotes = Object.keys(poll.votes).length;
                        const userVote = poll.votes[userProfile.id];
                        return (
                          <div className="mb-4 bg-slate-50 dark:bg-lifted rounded-2xl p-4">
                            <p className="font-black text-slate-800 dark:text-white text-sm mb-3">{poll.question}</p>
                            <div className="space-y-2">
                              {poll.options.map((opt, idx) => {
                                const voteCount = Object.values(poll.votes).filter(v => v === idx).length;
                                const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                const isLeading = totalVotes > 0 && voteCount === Math.max(...poll.options.map((_, i) => Object.values(poll.votes).filter(v => v === i).length));
                                const isUserChoice = userVote === idx;
                                return (
                                  <button key={idx} onClick={() => handleVotePoll(selectedThread.id, idx)}
                                    className={`w-full relative overflow-hidden rounded-xl px-4 py-2.5 text-left transition-all ${isUserChoice ? 'ring-2 ring-oasis-spring' : 'hover:bg-slate-100 dark:hover:bg-moon/10'}`}
                                    style={{ background: 'transparent' }}
                                  >
                                    <div className="absolute inset-0 rounded-xl transition-all duration-500" style={{ width: `${pct}%`, background: isLeading ? 'rgba(255,166,0,0.15)' : 'rgba(148,163,184,0.12)' }} />
                                    <div className="relative flex items-center justify-between">
                                      <span className="text-sm font-bold text-slate-800 dark:text-white">{opt}</span>
                                      <span className="text-xs font-black text-slate-500 dark:text-moon/40">{pct}%</span>
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
                            <span key={tag} className="inline-flex items-center gap-1 bg-oasis-spring/10 text-oasis-spring text-[10px] font-bold px-2.5 py-1 rounded-full">
                              <Hash className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-50 dark:border-white/5">
                        <div className="w-6 h-6 bg-oasis-spring/10 rounded-full flex items-center justify-center text-[10px] font-black text-oasis-spring">
                          {selectedThread.authorName.charAt(0)}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-moon/40 font-bold">{selectedThread.authorName} · {formatRelativeTime(selectedThread.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50 dark:border-white/5">
                        <span className="text-[10px] text-slate-400 font-bold ml-1">التفاعل:</span>
                        {['👍', '❤️', '😂', '😮'].map(emoji => {
                          const count = (selectedThread.reactions?.[emoji] || []).length;
                          const reacted = (selectedThread.reactions?.[emoji] || []).includes(userProfile.id);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(selectedThread.id, emoji)}
                              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border transition-all active:scale-90 ${reacted ? 'bg-oasis-spring/10 border-oasis-spring/30 text-oasis-spring' : 'bg-slate-50 dark:bg-lifted border-slate-100 dark:border-white/5 text-slate-500 dark:text-moon/40 hover:border-slate-200 dark:hover:border-white/10'}`}
                            >
                              {emoji}{count > 0 && <span className="text-[11px] ml-0.5">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedThread.replies.length > 0 && (
                      <p className="text-[10px] font-black text-slate-400 dark:text-moon/20 uppercase tracking-widest text-center">
                        {selectedThread.replies.length} {selectedThread.replies.length === 1 ? 'رد' : 'ردود'}
                      </p>
                    )}

                    {selectedThread.replies.map(reply => (
                      <div key={reply.id} className={`flex ${reply.authorName === userProfile.name ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm dark:shadow-black/30 ${reply.authorName === userProfile.name ? 'bg-oasis-spring text-midnight rounded-tr-none' : 'bg-white dark:bg-chamber border border-slate-100 dark:border-white/5 rounded-tl-none'}`}>
                          {reply.authorName !== userProfile.name && (
                            <p className="text-[9px] font-bold opacity-60 mb-1">{reply.authorName}</p>
                          )}
                          {reply.imageUrl && (
                            <SafeImage src={reply.imageUrl} className="w-full rounded-xl object-cover max-h-40 mb-2" alt="" fallbackType="placeholder" seed={reply.id} />
                          )}
                          <p className="text-sm">{reply.text}</p>
                          <p className={`text-[9px] mt-1 ${reply.authorName === userProfile.name ? 'opacity-60 text-right' : 'text-slate-400 dark:text-moon/40'}`}>
                            {formatRelativeTime(reply.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {selectedThread.replies.length === 0 && (
                      <div className="text-center py-8 text-slate-300 dark:text-moon/20">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold">لا يوجد ردود بعد. كن أول من يرد!</p>
                      </div>
                    )}

                    <div ref={threadEndRef} />
                  </div>

                  <div className="bg-white dark:bg-chamber border-t border-slate-100 dark:border-white/5 shrink-0">
                    {showReplyImageInput && (
                      <div className="px-4 pt-3">
                        <input
                          className="w-full bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-oasis-spring text-slate-900 dark:text-white"
                          placeholder="رابط الصورة https://..."
                          value={replyImageUrl}
                          onChange={e => setReplyImageUrl(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="p-4 flex gap-2">
                      <button
                        onClick={() => setShowReplyImageInput(v => !v)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90 ${showReplyImageInput ? 'bg-oasis-spring/10 text-oasis-spring' : 'bg-slate-50 dark:bg-lifted text-slate-400 dark:text-moon/40'}`}
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <input
                        className="flex-1 bg-slate-50 dark:bg-lifted rounded-full px-4 py-2.5 text-sm outline-none text-slate-900 dark:text-white"
                        placeholder="اكتب ردك هنا..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleReplyToThread()}
                      />
                      <button
                        onClick={handleReplyToThread}
                        className="w-10 h-10 bg-oasis-spring rounded-full flex items-center justify-center text-midnight shadow-md active:scale-90 transition-transform rtl:rotate-180"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : showCreateThread ? (
                <div className="h-full flex flex-col">
                  <div className="bg-white dark:bg-chamber border-b border-slate-100 dark:border-white/10 px-4 py-3 flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => { setShowCreateThread(false); setNewThread({ title: '', body: '', tags: '' }); }}
                      className="w-9 h-9 bg-slate-50 dark:bg-lifted rounded-full flex items-center justify-center text-slate-600 dark:text-moon/60 active:scale-90 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">موضوع جديد</p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-moon/40 mb-1.5 block uppercase tracking-widest">عنوان الموضوع *</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-oasis-spring transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-moon/20"
                        placeholder="مثال: أفضل أماكن التمرين في الرياض"
                        value={newThread.title}
                        onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-moon/40 mb-1.5 block uppercase tracking-widest">تفاصيل الموضوع</label>
                      <textarea
                        rows={5}
                        className="w-full bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-oasis-spring transition-all resize-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-moon/20"
                        placeholder="شارك أفكارك وتفاصيل الموضوع هنا..."
                        value={newThread.body}
                        onChange={(e) => setNewThread({ ...newThread, body: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-moon/40 mb-1.5 block uppercase tracking-widest">الوسوم (مفصولة بفاصلة)</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-oasis-spring transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-moon/20"
                        placeholder="مثال: رياضة, تمرين, نصيحة"
                        value={newThread.tags}
                        onChange={(e) => setNewThread({ ...newThread, tags: e.target.value })}
                      />
                      {newThread.tags.trim() && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {newThread.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1.5 bg-oasis-spring/10 text-oasis-spring text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-oasis-spring/20 shadow-mint-glow/5">
                              <Hash className="w-2.5 h-2.5" />{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-moon/40 mb-1.5 block uppercase tracking-widest">رابط صورة (اختياري)</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-oasis-spring transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-moon/20"
                        placeholder="https://..."
                        value={newThreadImageUrl}
                        onChange={(e) => setNewThreadImageUrl(e.target.value)}
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setNewPoll(p => ({ ...p, enabled: !p.enabled }))}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${newPoll.enabled ? 'bg-oasis-spring text-midnight border-transparent shadow-mint-glow' : 'bg-white dark:bg-chamber text-slate-600 dark:text-moon/40 border-slate-100 dark:border-white/10'}`}
                      >
                        📊 {newPoll.enabled ? 'إلغاء الاستفتاء' : 'إضافة استفتاء'}
                      </button>
                      {newPoll.enabled && (
                        <div className="mt-4 space-y-4 bg-slate-50 dark:bg-lifted rounded-3xl p-5 border border-slate-100 dark:border-white/10 shadow-inner">
                          <input
                            className="w-full bg-white dark:bg-chamber border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-oasis-spring text-slate-900 dark:text-white transition-all shadow-sm"
                            placeholder="سؤال الاستفتاء..."
                            value={newPoll.question}
                            onChange={e => setNewPoll(p => ({ ...p, question: e.target.value }))}
                          />
                          {newPoll.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                className="flex-1 bg-white dark:bg-chamber border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-oasis-spring text-slate-900 dark:text-white transition-all shadow-sm"
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
                            <button onClick={() => setNewPoll(p => ({ ...p, options: [...p.options, ''] }))} className="text-[10px] font-black text-oasis-spring flex items-center gap-1.5 uppercase tracking-widest mt-1 hover:opacity-80 transition-opacity">
                              <Plus className="w-3.5 h-3.5" /> إضافة خيار
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleCreateThread}
                      className="w-full h-14 rounded-2xl bg-oasis-spring text-midnight hover:bg-oasis-spring/90 shadow-mint-glow text-[10px] font-black uppercase tracking-widest"
                      disabled={!newThread.title.trim() || isSubmitting}
                    >
                      {isSubmitting ? '...' : 'نشر الموضوع'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="bg-white dark:bg-chamber border-b border-slate-100 dark:border-white/10 px-4 py-3.5 flex items-center gap-3 shrink-0">
                    <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 border border-transparent focus-within:border-oasis-spring transition-all">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                        placeholder="ابحث في المواضيع..."
                        value={threadSearch}
                        onChange={(e) => setThreadSearch(e.target.value)}
                      />
                      {threadSearch && (
                        <button onClick={() => setThreadSearch('')} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setShowCreateThread(true)}
                      className="flex items-center gap-2 bg-oasis-spring text-midnight text-[10px] font-black px-5 py-3 rounded-2xl active:scale-95 transition-all whitespace-nowrap uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" /> موضوع +
                    </button>
                  </div>
                  <div className="bg-white dark:bg-chamber border-b border-slate-100 dark:border-white/10 px-4 pb-3 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
                    {([
                      { key: 'latest', label: 'الأحدث' },
                      { key: 'replies', label: 'الأكثر ردوداً' },
                      { key: 'reactions', label: 'الأكثر تفاعلاً' },
                      { key: 'trending', label: 'رائج' },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setThreadSort(opt.key)}
                        className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${threadSort === opt.key ? 'bg-oasis-spring text-midnight border-transparent' : 'bg-white dark:bg-lifted text-slate-500 dark:text-moon/40 border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {suggestions.length > 0 && (
                      <div className="bg-white dark:bg-chamber p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 mb-4 shadow-sm dark:shadow-black/30">
                        <div className="flex items-center gap-2.5 mb-4">
                          <Star className="w-4 h-4 text-oasis-spring fill-oasis-spring" />
                          <h4 className="font-black text-[10px] text-slate-900 dark:text-white uppercase tracking-widest">ترشيحات المجتمع</h4>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar">
                          {suggestions.map(p => (
                            <div key={p._id || p.id} className="min-w-[110px] text-center group cursor-pointer">
                              <div className="relative h-16 w-full rounded-2xl overflow-hidden mb-2 border border-slate-100 dark:border-white/5 shadow-sm group-hover:scale-105 transition-transform">
                                <SafeImage src={p.photos?.[0] || p.image} className="w-full h-full object-cover" fallbackType="placeholder" seed={p._id || p.id} />
                              </div>
                              <p className="text-[9px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-tight line-clamp-1 group-hover:text-oasis-spring transition-colors">{p.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {communityThreads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-lifted rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100 dark:border-white/5 shadow-inner">
                          <MessageSquare className="w-10 h-10 text-slate-200 dark:text-moon/20" />
                        </div>
                        <h4 className="font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                          {threadSearch ? 'لا توجد مواضيع مطابقة' : 'لا توجد مواضيع بعد'}
                        </h4>
                        <p className="text-[11px] text-slate-400 dark:text-moon/40 mb-8 uppercase font-black tracking-widest leading-relaxed">
                          {threadSearch ? 'جرب كلمة بحث مختلفة' : 'كن أول من يبدأ النقاش في هذا المجتمع!'}
                        </p>
                        {!threadSearch && (
                          <button
                            onClick={() => setShowCreateThread(true)}
                            className="flex items-center gap-3 bg-oasis-spring text-midnight text-[11px] font-black px-8 py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest"
                          >
                            <Plus className="w-5 h-5" /> ابدأ أول نقاش
                          </button>
                        )}
                      </div>
                    ) : (
                      communityThreads.map(thread => (
                        <div
                          key={thread.id}
                          onClick={() => setSelectedThread(thread)}
                          className={`bg-white dark:bg-chamber rounded-[2rem] p-6 border shadow-sm dark:shadow-black/30 active:scale-[0.98] transition-all cursor-pointer ${thread.pinned ? 'border-oasis-spring bg-oasis-spring/[0.03]' : 'border-slate-100 dark:border-white/10'}`}
                        >
                          {thread.pinned && (
                            <div className="flex items-center gap-1.5 mb-3">
                              <span className="text-[9px] font-black text-midnight bg-oasis-spring px-2.5 py-1 rounded-lg uppercase tracking-widest">📌 مثبت</span>
                            </div>
                          )}
                          {thread.imageUrl && (
                            <SafeImage src={thread.imageUrl} className="w-full h-32 rounded-2xl object-cover mb-4 border border-slate-100 dark:border-white/5" alt="" fallbackType="placeholder" seed={thread.id} />
                          )}
                          <h4 className="font-black text-slate-900 dark:text-white text-sm leading-snug mb-2 uppercase tracking-tight">{thread.title}</h4>
                          {thread.body ? (
                            <p className="text-xs text-slate-500 dark:text-moon/60 leading-relaxed mb-4 line-clamp-2">{thread.body}</p>
                          ) : null}
                          {!thread.imageUrl && (() => {
                            const url = extractFirstUrl(thread.body); return url ? (
                              <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 mt-1 mb-4 text-xs text-slate-600 dark:text-moon/40 hover:bg-slate-100 dark:hover:bg-moon/5 transition-all shadow-sm">
                                <Globe className="w-4 h-4 text-slate-400 dark:text-moon/20 flex-shrink-0" />
                                <span className="truncate font-black uppercase tracking-tight">{urlDomain(url)}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-slate-300 dark:text-moon/20 flex-shrink-0 ml-auto" />
                              </a>
                            ) : null;
                          })()}
                          {thread.poll && (
                            <div className="flex items-center gap-3 mb-4 bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 border border-slate-100 dark:border-white/5">
                              <span className="text-sm">📊</span>
                              <span className="text-[10px] font-black text-slate-700 dark:text-white uppercase tracking-tight truncate">{thread.poll.question}</span>
                              <span className="text-[9px] font-black text-slate-400 dark:text-moon/40 uppercase tracking-widest shrink-0 ml-auto">{thread.poll.options.length} خيارات</span>
                            </div>
                          )}
                          {thread.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {thread.tags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1.5 bg-oasis-spring/10 text-oasis-spring text-[9px] font-black uppercase tracking-[0.1em] px-2.5 py-1 rounded-lg border border-oasis-spring/20">
                                  <Hash className="w-2.5 h-2.5" />{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 bg-oasis-spring/10 rounded-xl flex items-center justify-center text-[9px] font-black text-oasis-spring">
                                {thread.authorName.charAt(0)}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-moon/40 font-black uppercase tracking-widest">{thread.authorName} · {formatRelativeTime(thread.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-moon/40 uppercase tracking-widest bg-slate-50 dark:bg-lifted px-2.5 py-1 rounded-lg">
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{thread.replies.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4">
                            {['👍', '❤️', '😂', '😮'].map(emoji => {
                              const count = (thread.reactions?.[emoji] || []).length;
                              const reacted = (thread.reactions?.[emoji] || []).includes(userProfile.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={(e) => { e.stopPropagation(); handleToggleReaction(thread.id, emoji); }}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all active:scale-90 ${reacted ? 'bg-oasis-spring/10 border-oasis-spring/30 text-oasis-spring' : 'bg-slate-50 dark:bg-lifted border-slate-100 dark:border-white/10 text-slate-500 dark:text-moon/40 hover:border-slate-200'}`}
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
              <div className="bg-gradient-to-br from-chamber to-midnight rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden border border-white/5">
                <h3 className="text-xl font-black mb-1 uppercase tracking-tight text-oasis-spring">جدول طلعاتنا 🗓️</h3>
                <p className="text-[11px] text-moon/60 mb-6 uppercase font-black tracking-widest leading-relaxed">هنا تلقى كل الفعاليات المجدولة من قبل المشرفين والأعضاء الموثوقين.</p>
                <Button onClick={() => setShowCreateEventModal(true)} variant="secondary" className="bg-oasis-spring text-midnight py-3 px-6 text-[10px] font-black uppercase tracking-widest w-fit flex items-center gap-2 rounded-xl hover:bg-oasis-spring/90 shadow-mint-glow">
                  <Plus className="w-4 h-4" /> اقترح فعالية
                </Button>
              </div>

              <div className="space-y-4">
                {communityEvents.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 dark:text-moon/20">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-bold">لا توجد فعاليات مجدولة لهذا المجتمع حالياً</p>
                  </div>
                ) : communityEvents.map(event => {
                  const ext = event as ExtendedCommunityEvent;
                  const catInfo = EVENT_CATEGORIES.find(c => c.id === ext.category);
                  const cover = ext.coverPreset !== undefined ? COVER_PRESETS[ext.coverPreset] : null;
                  const isFull = !!ext.maxAttendees && event.attendeesCount >= ext.maxAttendees;
                  const spotsLeft = ext.maxAttendees ? ext.maxAttendees - event.attendeesCount : null;
                  const needsMore = ext.minAttendees ? Math.max(0, ext.minAttendees - event.attendeesCount) : 0;
                  const isDraft = ext.status === 'draft';
                  return (
                    <div key={event.id} className={`bg-white dark:bg-chamber rounded-[2rem] overflow-hidden shadow-sm dark:shadow-black/30 border ${isDraft ? 'border-amber-200 dark:border-amber-900/30' : 'border-slate-100 dark:border-white/10'}`}>
                      <div className="h-32 relative">
                        {cover ? (
                          <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: cover.bg }}>{cover.emoji}</div>
                        ) : (
                          <SafeImage src={event.image} className="w-full h-full object-cover" fallbackType="placeholder" seed={event.id} />
                        )}
                        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap rtl:right-3 rtl:left-auto">
                          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> {event.date}
                          </div>
                          {catInfo && (
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white">
                              {catInfo.emoji} {catInfo.label}
                            </div>
                          )}
                          {isDraft && (
                            <div className="bg-amber-400/90 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-900">مسودة</div>
                          )}
                        </div>
                        <div className="absolute bottom-3 right-3 flex gap-1.5 rtl:left-3 rtl:right-auto">
                          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> {event.attendeesCount}{ext.maxAttendees ? `/${ext.maxAttendees}` : ''} خوي
                          </div>
                          {ext.isFree === false && ext.fee ? (
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-400">{ext.fee} ر.س</div>
                          ) : ext.isFree !== false ? (
                            <div className="bg-black/40 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-oasis-spring">مجاني</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-4">
                        {ext.recurrence && ext.recurrence !== 'once' && (
                          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg mb-3">
                            🔁 {ext.recurrence === 'weekly' ? 'أسبوعياً' : 'شهرياً'}
                          </span>
                        )}

                        <h4 className="font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{event.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-moon/40 mb-4 leading-relaxed line-clamp-2">{event.description}</p>

                          <div className="mb-4 space-y-2">
                            {ext.requirements.map((r, i) => (
                              <p key={i} className="text-[10px] text-slate-500 dark:text-moon/40 flex items-center gap-2 font-black uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-oasis-spring"></span> {r}
                              </p>
                            ))}
                          </div>

                        <div className="flex items-center gap-5 text-[10px] text-slate-400 dark:text-moon/40 font-black uppercase tracking-widest mb-4 flex-wrap">
                          <span className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-oasis-spring" /> {event.time}{ext.endTime ? ` – ${ext.endTime}` : ''}
                          </span>
                          <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-oasis-spring" /> {event.locationName}</span>
                        </div>

                        {ext.mapUrl && (
                          <a href={ext.mapUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[10px] text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-widest mb-4 hover:underline"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-3.5 h-3.5" /> فتح الخريطة
                          </a>
                        )}

                        {ext.organizerNote && (
                          <p className="text-[10px] text-slate-400 dark:text-moon/20 italic mb-4 font-black uppercase tracking-widest leading-relaxed">💬 {ext.organizerNote}</p>
                        )}

                        {needsMore > 0 && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3 text-[10px] text-amber-700 font-bold">
                            ⚠️ يحتاج {needsMore} مشارك إضافي للتأكيد
                          </div>
                        )}

                        {spotsLeft !== null && spotsLeft <= 3 && spotsLeft > 0 && (
                          <p className="text-[10px] text-red-500 font-bold mb-3">🔴 {spotsLeft} أماكن متبقية فقط!</p>
                        )}

                        <Button
                          onClick={() => toggleJoinEvent(event.id)}
                          disabled={isFull && !joinedEvents.includes(event.id)}
                          className={`w-full py-2.5 text-xs font-black ${joinedEvents.includes(event.id) ? 'bg-slate-100 dark:bg-lifted text-slate-500 shadow-none' : isFull ? 'bg-slate-100 dark:bg-lifted text-slate-400 shadow-none cursor-not-allowed' : ''}`}
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base uppercase tracking-tight">الفزعات</h3>
                  <p className="text-[10px] text-slate-400 dark:text-moon/40 mt-0.5 uppercase font-black tracking-widest">اطلب المساعدة واكسب نقاط الكرم</p>
                </div>
                <button
                  onClick={() => { setShowCreateFazaModal(true); setFazaWizardStep(1); }}
                  className="flex items-center gap-2 bg-oasis-spring text-midnight text-[10px] font-black px-5 py-3 rounded-2xl active:scale-95 transition-all uppercase tracking-widest shadow-mint-glow"
                >
                  <Plus className="w-4 h-4" /> طلب فزعة
                </button>
              </div>
              <section>
                {communityFaza.length === 0 ? (
                  <div className="text-center py-20 text-slate-300 dark:text-moon/20">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-lifted rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-white/5 shadow-inner">
                      <ShieldCheck className="w-10 h-10 text-slate-200 dark:text-moon/20" />
                    </div>
                    <p className="text-sm font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">لا توجد فزعات حالياً</p>
                    <p className="text-[11px] text-slate-400 dark:text-moon/40 uppercase font-black tracking-widest mb-8">كن أول من يطلب مساعدة المجتمع!</p>
                    <button
                      onClick={() => { setShowCreateFazaModal(true); setFazaWizardStep(1); }}
                      className="bg-oasis-spring text-midnight text-[11px] font-black px-8 py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest inline-flex items-center gap-3 shadow-mint-glow"
                    >
                      <Plus className="w-5 h-5" /> اطلب فزعة الآن
                    </button>
                  </div>
                ) : communityFaza.map(req => (
                  <div key={req.id} className="bg-white dark:bg-chamber rounded-[2rem] p-6 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/10 mb-5">
                    <div className="flex items-center gap-3 mb-5">
                      <SafeImage src={req.userAvatar} className="w-11 h-11 rounded-2xl border-2 border-oasis-spring/20" fallbackType="icon" />
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{req.userName}</p>
                        <p className="text-[9px] text-slate-400 dark:text-moon/40 uppercase font-black tracking-widest">منذ ساعة</p>
                      </div>
                      <div className="ml-auto bg-oasis-spring/10 px-3 py-1.5 rounded-xl text-oasis-spring text-[10px] font-black uppercase tracking-widest border border-oasis-spring/20 rtl:mr-auto rtl:ml-0">
                        +{req.pointsReward} كرم
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-6 font-medium leading-relaxed">"{req.question}"</p>
                    <Button onClick={() => setShowFazaModal(req)} className="w-full py-3.5 text-[10px] font-black uppercase tracking-widest rounded-2xl" variant="secondary">تقديم فزعة</Button>
                  </div>
                ))}
              </section>
              {completedFaza.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-moon/20 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> الفزعات المنجزة
                  </h3>
                  <div className="space-y-3">
                    {completedFaza.map(fz => (
                      <div key={fz.id} className="bg-oasis-spring/5 border border-oasis-spring/10 rounded-2xl px-4 py-3.5 flex items-center gap-4 transition-all hover:bg-oasis-spring/10">
                        <CheckCircle2 className="w-5 h-5 text-oasis-spring shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 dark:text-white line-clamp-1 uppercase tracking-tight">{fz.question}</p>
                          <p className="text-[9px] text-slate-400 dark:text-moon/40 uppercase font-black tracking-widest mt-0.5">{formatRelativeTime(fz.answeredAt)}</p>
                        </div>
                        <span className="shrink-0 bg-oasis-spring text-midnight text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">+{fz.pointsEarned}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'about' && (() => {
            const aboutData = COMMUNITY_ABOUT[selectedCommunity.id] || COMMUNITY_ABOUT['default'];
            return (
              <div className="h-full overflow-y-auto p-4 space-y-4 pb-20">
                <div className="flex items-center gap-4 bg-white dark:bg-chamber rounded-[2rem] p-6 border border-slate-100 dark:border-white/10 shadow-sm dark:shadow-black/30">
                  <span className="text-4xl filter drop-shadow-lg">{selectedCommunity.icon}</span>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tight">{selectedCommunity.name}</h3>
                    <p className="text-[10px] text-slate-400 dark:text-moon/40 uppercase font-black tracking-widest">{selectedCommunity.memberCount.toLocaleString()} عضو نشط</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-chamber rounded-[2rem] p-6 border border-slate-100 dark:border-white/10 shadow-sm dark:shadow-black/30">
                  <h4 className="font-black text-slate-700 dark:text-white text-xs mb-3 uppercase tracking-widest flex items-center gap-2.5"><Info className="w-4 h-4 text-oasis-spring" /> عن المجتمع</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{aboutData.about}</p>
                </div>
                <div className="bg-white dark:bg-chamber rounded-[2rem] p-6 border border-slate-100 dark:border-white/10 shadow-sm dark:shadow-black/30">
                  <h4 className="font-black text-slate-700 dark:text-white text-xs mb-4 uppercase tracking-widest flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 text-oasis-spring" /> قواعد المجتمع</h4>
                  <ol className="space-y-4">
                    {aboutData.rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-4">
                        <span className="w-7 h-7 rounded-xl bg-oasis-spring text-midnight text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                        <p className="text-sm text-slate-700 dark:text-slate-400 leading-snug font-medium">{rule}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <button
                  onClick={() => { setSuccessMessage('تم إرسال رسالتك للمشرف 📩'); setTimeout(() => setSuccessMessage(null), 3000); }}
                  className="w-full py-4 bg-slate-900 dark:bg-moon text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                >
                  تواصل مع المشرف
                </button>
              </div>
            );
          })()}
        </div>

        {/* Create Event Wizard */}
        {showCreateEventModal && (() => {
          const closeModal = () => { setShowCreateEventModal(false); setEventErrors({}); setEventTouched({}); setWizardStep(1); };
          const selectedCat = EVENT_CATEGORIES.find(c => c.id === newEvent.category);
          const cover = COVER_PRESETS[newEvent.coverPreset];

          const STEPS = [
            { num: 1, title: 'الأساسيات', sub: 'اسم الفعالية ونوعها وشكلها' },
            { num: 2, title: 'الموعد والمكان', sub: 'متى وأين تنعقد الفعالية' },
            { num: 3, title: 'التفاصيل والنشر', sub: 'المعلومات الإضافية والنشر' },
          ];
          const current = STEPS[wizardStep - 1];

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end">
              <div className="bg-slate-50 dark:bg-midnight w-full rounded-t-[32px] shadow-2xl flex flex-col" style={{ maxHeight: '93vh' }}>
                <div className="flex-shrink-0 bg-white dark:bg-chamber rounded-t-[32px] px-6 pt-5 pb-4 shadow-sm dark:shadow-black/30">
                  <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-5" />
                  <div className="flex items-center gap-2 mb-5">
                    {STEPS.map((s, i) => (
                      <React.Fragment key={s.num}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${wizardStep > s.num ? 'bg-oasis-spring text-midnight scale-95' : wizardStep === s.num ? 'bg-oasis-spring text-midnight ring-4 ring-oasis-spring/10 dark:ring-oasis-spring/20' : 'bg-slate-100 dark:bg-moon/10 text-slate-400 dark:text-moon/40'}`}>
                          {wizardStep > s.num ? '✓' : s.num}
                        </div>
                        {i < 2 && (
                          <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-100 dark:bg-moon/10">
                            <div className={`h-full bg-oasis-spring rounded-full transition-all duration-500 ${wizardStep > s.num ? 'w-full' : 'w-0'}`} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">{current.title}</h3>
                      <p className="text-xs text-slate-400 dark:text-moon/40 mt-0.5">{current.sub}</p>
                    </div>
                    <button onClick={closeModal} className="w-9 h-9 bg-slate-100 dark:bg-moon/10 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                      <X className="w-4 h-4 text-slate-500 dark:text-moon/40" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  {wizardStep === 1 && (
                    <>
                      <div className="bg-white dark:bg-chamber rounded-3xl p-4 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-400 dark:text-moon/40 uppercase tracking-widest mb-3 text-center">معاينة الفعالية</p>
                        <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-black/30 mx-auto" style={{ maxWidth: 240 }}>
                          <div className="h-20 flex items-center justify-center text-4xl" style={{ background: cover.bg }}>
                            {cover.emoji}
                          </div>
                          <div className="p-3 bg-white dark:bg-chamber">
                            <p className={`font-black text-sm leading-tight truncate ${newEvent.title ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-moon/20'}`}>
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

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5 space-y-1">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-2">اسم الفعالية <span className="text-red-400">*</span></p>
                        <input
                          className={`w-full bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all border ${eventErrors.title && eventTouched.title ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 dark:border-white/5 focus:ring-indigo-300'}`}
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

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">نوع الفعالية <span className="text-red-400">*</span></p>
                        <div className="grid grid-cols-4 gap-2">
                          {EVENT_CATEGORIES.map(cat => (
                            <button key={cat.id} type="button"
                              onClick={() => { setNewEvent(p => ({ ...p, category: cat.id })); setEventErrors(p => ({ ...p, category: '' })); }}
                              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all active:scale-95 ${newEvent.category === cat.id ? 'border-oasis-spring bg-oasis-spring/5 shadow-sm dark:shadow-black/30' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-chamber hover:border-slate-200 dark:hover:border-white/10'}`}
                            >
                              <span className="text-2xl">{cat.emoji}</span>
                              <span className={`text-[9px] font-black leading-tight text-center ${newEvent.category === cat.id ? 'text-oasis-spring' : 'text-slate-500 dark:text-moon/40'}`}>{cat.label}</span>
                            </button>
                          ))}
                        </div>
                        {eventErrors.category && eventTouched.category && (
                          <p className="text-red-500 text-xs flex items-center gap-1 mt-2"><span>⚠</span>{eventErrors.category}</p>
                        )}
                      </div>

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">غلاف الفعالية</p>
                        <div className="flex gap-3">
                          {COVER_PRESETS.map((preset, idx) => (
                            <button key={idx} type="button"
                              onClick={() => setNewEvent(p => ({ ...p, coverPreset: idx }))}
                              className={`flex-1 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-95 ${newEvent.coverPreset === idx ? 'ring-3 ring-indigo-500 ring-offset-2 scale-105 shadow-lg' : 'opacity-60 hover:opacity-90'}`}
                              style={{ background: preset.bg }}
                            >
                              {preset.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {wizardStep === 2 && (
                    <>
                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5 space-y-4">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">التاريخ والوقت</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">التاريخ <span className="text-red-400">*</span></p>
                            <input type="date"
                              className={`w-full bg-slate-50 dark:bg-lifted rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 border transition-all ${eventErrors.date && eventTouched.date ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 dark:border-white/5 focus:ring-indigo-300'}`}
                              value={newEvent.date}
                              onChange={e => { setNewEvent(p => ({ ...p, date: e.target.value })); if (eventTouched.date) { const er = validateStep2(); setEventErrors(p => ({ ...p, date: er.date || '' })); } }}
                              onBlur={() => { setEventTouched(p => ({ ...p, date: true })); const er = validateStep2(); setEventErrors(p => ({ ...p, date: er.date || '' })); }}
                            />
                            {eventErrors.date && eventTouched.date && <p className="text-red-500 text-xs mt-1">⚠ {eventErrors.date}</p>}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">وقت البداية <span className="text-red-400">*</span></p>
                            <input type="time"
                              className={`w-full bg-slate-50 dark:bg-lifted rounded-2xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 border transition-all ${eventErrors.time && eventTouched.time ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 dark:border-white/5 focus:ring-indigo-300'}`}
                              value={newEvent.time}
                              onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))}
                              onBlur={() => { setEventTouched(p => ({ ...p, time: true })); const er = validateStep2(); setEventErrors(p => ({ ...p, time: er.time || '' })); }}
                            />
                            {eventErrors.time && eventTouched.time && <p className="text-red-500 text-xs mt-1">⚠ {eventErrors.time}</p>}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">وقت الانتهاء <span className="text-slate-300 font-normal">(اختياري)</span></p>
                          <input type="time"
                            className="w-full bg-slate-50 dark:bg-lifted rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100 dark:border-white/5"
                            value={newEvent.endTime}
                            onChange={e => setNewEvent(p => ({ ...p, endTime: e.target.value }))}
                          />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-2">التكرار</p>
                          <div className="flex gap-2">
                            {RECURRENCE_OPTS.map(opt => (
                              <button key={opt.id} type="button"
                                onClick={() => setNewEvent(p => ({ ...p, recurrence: opt.id }))}
                                className={`flex-1 py-2.5 rounded-2xl text-xs font-black border-2 transition-all active:scale-95 ${newEvent.recurrence === opt.id ? 'border-oasis-spring bg-oasis-spring/5 text-oasis-spring' : 'border-slate-100 dark:border-white/5 text-slate-500 dark:text-moon/40 bg-white dark:bg-chamber'}`}
                              >{opt.label}</button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5 space-y-3">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">المكان</p>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">اسم الموقع</p>
                          <input
                            className="w-full bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100 dark:border-white/5"
                            placeholder="مثال: ملاعب فور بادل، حي النرجس"
                            value={newEvent.location}
                            onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">رابط الخريطة <span className="text-slate-300 font-normal">(اختياري)</span></p>
                          <input
                            className="w-full bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100 dark:border-white/5"
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

                  {wizardStep === 3 && (
                    <>
                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">وصف الفعالية <span className="text-slate-300 dark:text-moon/40 text-xs font-normal">(اختياري)</span></p>
                        <textarea
                          className="w-full h-28 bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100 dark:border-white/5 resize-none"
                          placeholder="اكتب وصفاً للفعالية وما يمكن للمشاركين توقعه..."
                          value={newEvent.description}
                          onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
                        />
                        <p className="text-[10px] text-slate-300 text-left mt-1">{newEvent.description.length}/300</p>
                      </div>

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">ماذا يجب أن يحضر المشاركون؟</p>
                        <p className="text-[10px] text-slate-400 mb-3">اضغط Enter أو + لإضافة كل عنصر</p>
                        {newEvent.requirements.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {newEvent.requirements.map((req, i) => (
                              <div key={i} className="flex items-center gap-2 bg-oasis-spring/5 rounded-xl px-3 py-2">
                                <span className="text-oasis-spring font-black text-sm">•</span>
                                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 font-medium">{req}</span>
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
                              className="flex-1 bg-slate-50 dark:bg-lifted border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                              placeholder="مثال: أحضر مضربك الخاص"
                              value={newReqText}
                              onChange={e => setNewReqText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && newReqText.trim()) { e.preventDefault(); setNewEvent(p => ({ ...p, requirements: [...p.requirements, newReqText.trim()] })); setNewReqText(''); } }}
                            />
                            <button type="button" disabled={!newReqText.trim()}
                              onClick={() => { if (newReqText.trim()) { setNewEvent(p => ({ ...p, requirements: [...p.requirements, newReqText.trim()] })); setNewReqText(''); } }}
                              className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white disabled:opacity-30 active:scale-95 transition-all shadow-sm dark:shadow-black/30 shadow-indigo-200">
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">عدد المشاركين</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">الحد الأقصى</p>
                            <input type="number" min="1"
                              className="w-full bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100 dark:border-white/5"
                              placeholder="بلا حد"
                              value={newEvent.maxAttendees}
                              onChange={e => setNewEvent(p => ({ ...p, maxAttendees: e.target.value }))}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">الحد الأدنى للانعقاد</p>
                            <input type="number" min="1"
                              className={`w-full bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 border transition-all ${eventErrors.minAttendees ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 dark:border-white/5 focus:ring-indigo-300'}`}
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

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">رسوم الدخول</p>
                        <div className="flex gap-2 mb-3">
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, isFree: true, fee: '' }))}
                            className={`flex-1 py-3 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${newEvent.isFree ? 'border-oasis-spring bg-oasis-spring/5 text-oasis-spring shadow-sm dark:shadow-black/30' : 'border-slate-100 dark:border-white/5 text-slate-500 dark:text-moon/40 bg-white dark:bg-chamber'}`}>
                            🆓 مجاني
                          </button>
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, isFree: false }))}
                            className={`flex-1 py-3 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${!newEvent.isFree ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 shadow-sm dark:shadow-black/30' : 'border-slate-100 dark:border-white/5 text-slate-500 dark:text-moon/40 bg-white dark:bg-chamber'}`}>
                            💰 مدفوع
                          </button>
                        </div>
                        {!newEvent.isFree && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 dark:text-moon/40 mb-1.5">المبلغ (ريال) <span className="text-red-400">*</span></p>
                            <input type="number" min="0" step="0.5"
                              className={`w-full bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 border transition-all ${eventErrors.fee && eventTouched.fee ? 'border-red-300 focus:ring-red-300' : 'border-slate-100 dark:border-white/5 focus:ring-indigo-300'}`}
                              placeholder="0.00"
                              value={newEvent.fee}
                              onChange={e => { setNewEvent(p => ({ ...p, fee: e.target.value })); setEventTouched(p => ({ ...p, fee: true })); if (e.target.value) setEventErrors(p => ({ ...p, fee: '' })); }}
                            />
                            {eventErrors.fee && eventTouched.fee && <p className="text-red-500 text-xs mt-1">⚠ {eventErrors.fee}</p>}
                          </div>
                        )}
                      </div>

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">ملاحظة للمشاركين <span className="text-slate-300 dark:text-moon/40 text-xs font-normal">(اختياري)</span></p>
                        <p className="text-[10px] text-slate-400 mb-3">مثل رقم التواصل أو تعليمات خاصة</p>
                        <input
                          className="w-full bg-slate-50 dark:bg-lifted rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 border border-slate-100 dark:border-white/5"
                          placeholder="مثال: راسلني على واتساب قبل الحضور"
                          value={newEvent.organizerNote}
                          onChange={e => setNewEvent(p => ({ ...p, organizerNote: e.target.value }))}
                        />
                      </div>

                      <div className="bg-white dark:bg-chamber rounded-3xl p-5 shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5">
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3">طريقة النشر</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, status: 'published' }))}
                            className={`flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${newEvent.status === 'published' ? 'border-oasis-spring bg-oasis-spring/5 shadow-sm dark:shadow-black/30' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-chamber'}`}>
                            <span className="text-2xl">✨</span>
                            <span className={`text-xs font-black ${newEvent.status === 'published' ? 'text-oasis-spring' : 'text-slate-500 dark:text-moon/40'}`}>نشر الآن</span>
                            <span className={`text-[9px] text-center leading-tight ${newEvent.status === 'published' ? 'text-oasis-spring/60' : 'text-slate-300'}`}>يراها الأعضاء فوراً</span>
                          </button>
                          <button type="button" onClick={() => setNewEvent(p => ({ ...p, status: 'draft' }))}
                            className={`flex-1 flex flex-col items-center gap-1 py-3.5 rounded-2xl border-2 transition-all active:scale-95 ${newEvent.status === 'draft' ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-sm dark:shadow-black/30' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-chamber'}`}>
                            <span className="text-2xl">📝</span>
                            <span className={`text-xs font-black ${newEvent.status === 'draft' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-moon/40'}`}>مسودة</span>
                            <span className={`text-[9px] text-center leading-tight ${newEvent.status === 'draft' ? 'text-amber-400' : 'text-slate-300'}`}>يمكنك نشرها لاحقاً</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex-shrink-0 bg-white dark:bg-chamber border-t border-slate-100 dark:border-white/5 px-6 py-4">
                  <div className="flex gap-3">
                    {wizardStep > 1 && (
                      <button type="button"
                        onClick={() => { setWizardStep(s => (s - 1) as 1 | 2 | 3); setEventErrors({}); }}
                        className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-moon/10 text-slate-600 dark:text-moon/60 font-black text-sm active:scale-95 transition-all">
                        ← رجوع
                      </button>
                    )}
                    {wizardStep < 3 ? (
                      <button type="button" onClick={handleNextStep}
                        className="flex-1 py-3.5 rounded-2xl bg-oasis-spring text-midnight font-black text-sm active:scale-95 transition-all shadow-mint-glow">
                        التالي →
                      </button>
                    ) : (
                      <button type="button" onClick={handleCreateEvent} disabled={isSubmitting}
                        className="flex-1 py-3.5 rounded-2xl bg-oasis-spring text-midnight font-black text-sm active:scale-95 transition-all shadow-mint-glow disabled:opacity-60 flex items-center justify-center gap-2">
                        {isSubmitting ? (
                          <>
                            <span className="w-4 h-4 border-2 border-midnight/30 border-t-midnight rounded-full animate-spin" />
                            جاري النشر...
                          </>
                        ) : newEvent.status === 'draft' ? '💾 حفظ المسودة' : ' نشر الفعالية'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Faza Wizard Modal */}
        {showCreateFazaModal && (() => {
          const FAZA_STEPS = [
            { num: 1, title: 'سؤالك', sub: 'وصف طلبك بوضوح' },
            { num: 2, title: 'المكافأة', sub: 'حدد نقاط الكرم' },
            { num: 3, title: 'المراجعة', sub: 'راجع وأرسل' },
          ];
          const selectedCat = FAZA_CATEGORIES.find(c => c.id === newFazaForm.category);
          const urgencyOpt = FAZA_URGENCY.find(u => u.id === newFazaForm.urgency)!;
          const rewardLabel = newFazaForm.rewardPoints >= 150 ? '🔥 جذاب جداً' : newFazaForm.rewardPoints >= 75 ? '👍 عادي' : '📉 منخفض';
          const rewardColor = newFazaForm.rewardPoints >= 150 ? '#10b981' : newFazaForm.rewardPoints >= 75 ? '#f59e0b' : '#ef4444';
          const walletPts = userProfile.karamPoints || 0;
          const similarFaza = localFazaRequests.filter(r =>
            r.communityId === selectedCommunity!.id &&
            newFazaForm.question.trim().length > 5 &&
            r.question.split(' ').some(w => w.length > 3 && newFazaForm.question.includes(w))
          ).slice(0, 2);

          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end" onClick={resetFazaWizard}>
              <div
                className="bg-slate-50 dark:bg-midnight w-full rounded-t-[32px] shadow-2xl flex flex-col"
                style={{ maxHeight: '93vh' }}
                onClick={e => e.stopPropagation()}
              >
                {fazaSubmitSuccess ? (
                  <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center text-4xl animate-bounce">🎉</div>
                    <h3 className="font-black text-2xl text-slate-900 dark:text-white">تم إرسال فزعتك!</h3>
                    <p className="text-sm text-slate-500 dark:text-moon/40 leading-relaxed">
                      طلبك وصل لأعضاء <span className="font-black text-slate-700 dark:text-white">{selectedCommunity!.name}</span>.<br />
                      عادةً يجاوب الأعضاء خلال ساعة ⚡
                    </p>
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-2xl px-5 py-3 flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div className="text-right rtl:text-right ltr:text-left">
                        <p className="text-xs font-black text-slate-900 dark:text-white">تم خصم {newFazaForm.rewardPoints} نقطة كرم</p>
                        <p className="text-[10px] text-slate-400 dark:text-moon/40">ستُعاد إذا لم يُجب أحد خلال 48 ساعة</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { if (navigator.share) navigator.share({ title: 'فزعتي في تريبو', text: newFazaForm.question }); }}
                      className="flex items-center gap-2 bg-white dark:bg-chamber border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform"
                    >
                      📤 شارك فزعتك
                    </button>
                    <button onClick={resetFazaWizard} className="bg-oasis-spring text-midnight font-black text-sm px-10 py-3.5 rounded-2xl active:scale-95 transition-transform shadow-mint-glow">
                      تمام 👌
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-white/8 bg-white dark:bg-chamber rounded-t-[32px] shrink-0">
                      <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-4" />
                      <div className="flex items-center gap-1 mb-4">
                        {FAZA_STEPS.map((s, i) => (
                          <React.Fragment key={s.num}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${fazaWizardStep > s.num ? 'bg-oasis-spring text-midnight scale-95' : fazaWizardStep === s.num ? 'bg-oasis-spring text-midnight ring-4 ring-oasis-spring/10 dark:ring-oasis-spring/20' : 'bg-slate-100 dark:bg-moon/10 text-slate-400 dark:text-moon/40'}`}>
                              {fazaWizardStep > s.num ? '✓' : s.num}
                            </div>
                            {i < 2 && (
                              <div className="flex-1 h-1 rounded-full overflow-hidden bg-slate-100 dark:bg-moon/10">
                                <div className={`h-full bg-oasis-spring rounded-full transition-all duration-500 ${fazaWizardStep > s.num ? 'w-full' : 'w-0'}`} />
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-black text-lg text-slate-900 dark:text-white">{FAZA_STEPS[fazaWizardStep - 1].title}</h3>
                          <p className="text-xs text-slate-400 dark:text-moon/40">{FAZA_STEPS[fazaWizardStep - 1].sub}</p>
                        </div>
                        <button onClick={resetFazaWizard} className="p-2 bg-slate-50 dark:bg-moon/10 rounded-full active:scale-90 transition-transform">
                          <X className="w-5 h-5 text-slate-400 dark:text-moon/40" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                      {fazaWizardStep === 1 && (
                        <>
                          <div>
                            <p className="text-xs font-black text-slate-500 dark:text-moon/40 mb-2 uppercase tracking-wider">ابدأ من هنا</p>
                            <div className="flex flex-wrap gap-2">
                              {FAZA_TEMPLATES.map(tpl => (
                                <button key={tpl} onClick={() => setNewFazaForm(p => ({ ...p, question: p.question ? p.question : tpl }))}
                                  className="px-3 py-1.5 bg-white dark:bg-chamber border border-slate-200 dark:border-white/10 text-slate-600 dark:text-moon/60 text-xs font-bold rounded-xl active:scale-95 transition-transform hover:border-emerald-400 dark:hover:border-emerald-600 hover:text-emerald-600">
                                  {tpl}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-500 dark:text-moon/40 mb-2">سؤالك <span className="text-red-400">*</span></p>
                            <div className="relative">
                              <textarea
                                className={`w-full h-32 p-4 bg-white dark:bg-chamber rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-oasis-spring text-slate-900 dark:text-white resize-none leading-relaxed ${fazaErrors.question ? 'border-red-300 dark:border-red-900/50' : 'border-slate-200 dark:border-white/10'}`}
                                placeholder="اكتب سؤالك بوضوح... كلما كان واضحاً، كلما جاءتك إجابات أفضل"
                                maxLength={280}
                                value={newFazaForm.question}
                                onChange={e => { setNewFazaForm(p => ({ ...p, question: e.target.value })); if (fazaErrors.question) setFazaErrors(p => ({ ...p, question: '' })); }}
                              />
                              <span className={`absolute bottom-3 left-3 text-[10px] font-bold ${newFazaForm.question.length > 250 ? 'text-red-400' : 'text-slate-300'}`}>
                                {newFazaForm.question.length}/280
                              </span>
                            </div>
                            {fazaErrors.question && <p className="text-xs text-red-500 mt-1 font-bold">{fazaErrors.question}</p>}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-500 dark:text-moon/40 mb-2">نوع المساعدة</p>
                            <div className="grid grid-cols-4 gap-2">
                              {FAZA_CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => setNewFazaForm(p => ({ ...p, category: cat.id }))}
                                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl border transition-all active:scale-95 ${newFazaForm.category === cat.id ? 'border-oasis-spring bg-oasis-spring/5' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-chamber'}`}>
                                  <span className="text-xl">{cat.emoji}</span>
                                  <span className="text-[9px] font-black text-slate-600 dark:text-moon/40">{cat.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {fazaWizardStep === 2 && (
                        <>
                          <div className="bg-white dark:bg-chamber rounded-2xl border border-slate-100 dark:border-white/5 p-5">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-black text-slate-700 dark:text-slate-300">مكافأة الكرم</p>
                              <span className="text-xs font-black" style={{ color: rewardColor }}>{rewardLabel}</span>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-3xl font-black text-slate-900 dark:text-white">{newFazaForm.rewardPoints}</span>
                              <span className="text-xs text-slate-400 dark:text-moon/40 font-bold">نقطة كرم</span>
                            </div>
                            <input
                              type="range" min={10} max={Math.min(200, walletPts)} step={10}
                              value={newFazaForm.rewardPoints}
                              onChange={e => setNewFazaForm(p => ({ ...p, rewardPoints: parseInt(e.target.value) }))}
                              className="w-full accent-oasis-spring h-2"
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

                          <div>
                            <p className="text-xs font-black text-slate-500 dark:text-moon/40 mb-2">متى تحتاج الإجابة؟</p>
                            <div className="space-y-2">
                              {FAZA_URGENCY.map(u => (
                                <button key={u.id} onClick={() => setNewFazaForm(p => ({ ...p, urgency: u.id }))}
                                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 text-right ${newFazaForm.urgency === u.id ? 'border-oasis-spring bg-oasis-spring/5' : 'border-slate-100 dark:border-white/5 bg-white dark:bg-chamber'}`}>
                                  <span className="text-xl">{u.emoji}</span>
                                  <div className="flex-1">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 dark:text-white">{u.label}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-moon/40">{u.desc}</p>
                                  </div>
                                  {newFazaForm.urgency === u.id && (
                                    <div className="w-5 h-5 rounded-full bg-oasis-spring flex items-center justify-center shrink-0">
                                      <span className="text-midnight text-[10px]">✓</span>
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-black text-slate-500 dark:text-moon/40 mb-2">صورة توضيحية (اختياري)</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <input type="text"
                                  className="w-full px-4 py-3 bg-white dark:bg-chamber border border-slate-200 dark:border-white/10 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                  placeholder="رابط صورة توضيحية..."
                                  value={newFazaForm.photoUrl}
                                  onChange={e => setNewFazaForm(p => ({ ...p, photoUrl: e.target.value }))}
                                />
                              </div>
                              {newFazaForm.photoUrl && (
                                <img src={newFazaForm.photoUrl} className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10" onError={e => (e.currentTarget.style.display = 'none')} loading="lazy" />
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {fazaWizardStep === 3 && (
                        <>
                          <div>
                            <p className="text-xs font-black text-slate-500 dark:text-moon/40 mb-2 uppercase tracking-wider">كيف ستظهر فزعتك</p>
                            <div className="bg-white dark:bg-chamber rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-black/30 p-5">
                              <div className="flex items-center gap-3 mb-3">
                                <img
                                  src={newFazaForm.anonymous ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=anon' : (userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.id}`)}
                                  className="w-10 h-10 rounded-full border-2 border-emerald-100 dark:border-emerald-900/30"
                                  loading="lazy"
                                />
                                <div className="flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white">{newFazaForm.anonymous ? 'مجهول الهوية' : userProfile.name}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-moon/40 flex items-center gap-1">
                                    {urgencyOpt.emoji} {urgencyOpt.label}
                                    {selectedCat && <span className="mx-1">·</span>}
                                    {selectedCat && <span style={{ color: selectedCat.color }}>{selectedCat.emoji} {selectedCat.label}</span>}
                                  </p>
                                </div>
                                <div className="bg-oasis-spring/10 dark:bg-oasis-spring/20 px-3 py-1 rounded-xl text-oasis-spring dark:text-oasis-spring text-xs font-black">
                                  +{newFazaForm.rewardPoints} كرم
                                </div>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">"{newFazaForm.question || 'سؤالك سيظهر هنا...'}"</p>
                              {newFazaForm.photoUrl && (
                                <img src={newFazaForm.photoUrl} className="mt-3 w-full h-28 object-cover rounded-xl border border-slate-100 dark:border-white/5" onError={e => (e.currentTarget.style.display = 'none')} loading="lazy" />
                              )}
                            </div>
                          </div>

                          <div className="bg-white dark:bg-chamber rounded-2xl border border-slate-100 dark:border-white/5 p-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-black text-slate-800 dark:text-white">🎭 نشر مجهول الهوية</p>
                              <p className="text-[10px] text-slate-400 dark:text-moon/40 mt-0.5">لن يظهر اسمك للأعضاء</p>
                            </div>
                            <button
                              onClick={() => setNewFazaForm(p => ({ ...p, anonymous: !p.anonymous }))}
                              className={`w-12 h-7 rounded-full transition-all duration-300 relative ${newFazaForm.anonymous ? 'bg-oasis-spring' : 'bg-slate-200 dark:bg-moon/20'}`}
                            >
                              <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-moon/40 rounded-full shadow transition-all duration-300 ${newFazaForm.anonymous ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                          </div>

                          {similarFaza.length > 0 && (
                            <div className="bg-oasis-spring/5 dark:bg-oasis-spring/10 border border-oasis-spring/20 rounded-2xl p-4">
                              <p className="text-xs font-black text-oasis-spring mb-2 flex items-center gap-1">🔍 أسئلة مشابهة موجودة</p>
                              {similarFaza.map(sf => (
                                <div key={sf.id} className="text-xs text-oasis-spring/80 leading-relaxed mb-1">
                                  · "{sf.question.slice(0, 80)}{sf.question.length > 80 ? '...' : ''}"
                                </div>
                              ))}
                              <p className="text-[10px] text-oasis-spring/60 mt-1">تأكد أن سؤالك مختلف لتحصل على أفضل إجابة</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="px-5 py-4 bg-white dark:bg-chamber border-t border-slate-100 dark:border-white/8 shrink-0 flex gap-3">
                      {fazaWizardStep > 1 && (
                        <button onClick={() => setFazaWizardStep(s => (s - 1) as 1 | 2 | 3)} className="px-5 py-3.5 bg-slate-100 dark:bg-lifted text-slate-600 dark:text-moon/60 font-black text-sm rounded-2xl active:scale-95 transition-transform">
                          ← رجوع
                        </button>
                      )}
                      <button
                        disabled={fazaSubmitting || (fazaWizardStep === 2 && newFazaForm.rewardPoints > walletPts)}
                        onClick={() => {
                          if (fazaWizardStep < 3) {
                            if (fazaWizardStep === 1 && !newFazaForm.question.trim()) { setFazaErrors({ question: 'اكتب سؤالك أولاً' }); return; }
                            setFazaWizardStep(s => (s + 1) as 1 | 2 | 3);
                          } else { handleCreateFaza(); }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-oasis-spring text-midnight font-black text-sm py-3.5 rounded-2xl active:scale-95 transition-transform disabled:opacity-50 shadow-mint-glow"
                      >
                        {fazaSubmitting ? (
                          <><span className="w-4 h-4 border-2 border-midnight/30 border-t-midnight rounded-full animate-spin" /> جاري الإرسال...</>
                        ) : fazaWizardStep < 3 ? 'التالي →' : ' أرسل الفزعة'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Faza Answer Modal */}
        {showFazaModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-chamber rounded-[40px] w-full max-sm:max-w-xs p-8 shadow-2xl relative animate-in zoom-in-95 border border-slate-100 dark:border-white/5">
              <button onClick={() => setShowFazaModal(null)} className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-lifted rounded-full"><X className="w-5 h-5 text-slate-400 dark:text-moon/40" /></button>
              <h3 className="font-black text-xl mb-2 text-slate-900 dark:text-white">تقديم فزعة لـ {showFazaModal.userName}</h3>
              <p className="text-xs text-slate-500 dark:text-moon/40 mb-6">ساعد غيرك واكسب {showFazaModal.pointsReward} نقطة كرم ورصيد محفظة.</p>
              <textarea className="w-full h-32 p-4 bg-slate-50 dark:bg-lifted rounded-3xl border border-slate-100 dark:border-white/5 text-sm outline-none focus:ring-2 focus:ring-oasis-spring text-slate-900 dark:text-white mb-6" placeholder="اكتب نصيحتك هنا..." value={fazaAnswer} onChange={(e) => setFazaAnswer(e.target.value)} />
              <Button onClick={handleFazaSubmit} className="w-full py-4 font-black bg-oasis-spring text-midnight shadow-mint-glow">إرسال الفزعة</Button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-midnight dark:bg-chamber text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 border border-white/5">
            <div className="w-6 h-6 bg-oasis-spring rounded-full flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-midnight" /></div>
            <span className="font-black text-sm">{successMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-28 overflow-y-auto h-full bg-slate-50 dark:bg-midnight">
      <div className="sticky top-0 z-20 bg-white dark:bg-chamber border-b border-slate-100 dark:border-white/5 px-6 pt-6 pb-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{t.tabCommunities || 'المجتمعات'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative w-9 h-9 bg-white dark:bg-lifted rounded-full shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5 flex items-center justify-center active:scale-90 transition-transform"
              onClick={() => setUnreadCount(0)}
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-moon/40" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="bg-white dark:bg-lifted px-3 py-1.5 rounded-2xl shadow-sm dark:shadow-black/30 border border-slate-100 dark:border-white/5 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-oasis-spring/10 flex items-center justify-center text-oasis-spring">
                <WalletIcon className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white">{(userProfile.walletBalance || 0).toFixed(2)} ر.س</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMainTab('communities')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-2xl text-sm font-black transition-all border-b-2 ${mainTab === 'communities' ? 'border-oasis-spring text-oasis-spring bg-oasis-spring/5' : 'border-transparent text-slate-400 dark:text-moon/40'}`}
          >
            <Users className="w-4 h-4" /> المجتمعات
          </button>
          <button
            onClick={() => setMainTab('traveling')}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-2xl text-sm font-black transition-all border-b-2 ${mainTab === 'traveling' ? 'border-oasis-spring text-oasis-spring bg-oasis-spring/5' : 'border-transparent text-slate-400 dark:text-moon/40'}`}
          >
            {(t as any).travelingTogether || (ar ? '🤝 سفر مع رفاق' : '🤝 Traveling Together')}
            {travelPosts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-oasis-spring/20 text-oasis-spring text-[9px] font-black rounded-full">{travelPosts.length}</span>
            )}
          </button>
        </div>
      </div>

      {mainTab === 'communities' && (
        <div className="p-6 space-y-8">
          {/* CTA Banner */}
          <div className="rounded-3xl overflow-hidden shadow-lg shadow-oasis-spring/10 bg-chamber">
            <div className="p-5 flex items-center gap-4 border border-white/5">
              <div className="flex-1">
                <p className="text-white font-black text-sm leading-tight">{ar ? 'السفر أجمل مع رفاق' : 'Travel is better together'}</p>
                <p className="text-oasis-spring text-xs mt-0.5">{ar ? 'انضم لمجتمع وتواصل مع مسافرين من كل أنحاء المملكة.' : 'Join a community and connect with fellow explorers across the Kingdom.'}</p>
              </div>
              <button
                onClick={() => setShowPostTripModal(true)}
                className="shrink-0 px-4 py-2.5 bg-oasis-spring text-midnight font-black text-xs rounded-2xl active:scale-95 transition-transform shadow-mint-glow"
              >
                {ar ? 'ابحث عن رفاق ←' : 'Find Travel Buddies →'}
              </button>
            </div>
          </div>

          {(() => {
            const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const recapThreads = 0; // threads not tracked globally yet
            const recapEvents = localEvents.filter(e => new Date(e.date).getTime() > weekStart - 7 * 24 * 3600 * 1000).length;
            const recapTrips = travelPosts.filter(p => p.timestamp > weekStart && p.userId !== userProfile.id).length;
            if (recapThreads + recapEvents + recapTrips === 0) return null;
            return (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-chamber dark:to-midnight border border-amber-200 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <h3 className="font-black text-amber-800 dark:text-amber-500 text-sm mb-3">هذا الأسبوع في مجتمعاتك 📊</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 text-center bg-white dark:bg-lifted rounded-2xl py-2.5">
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{recapThreads}</p>
                    <p className="text-[9px] font-bold text-amber-600 dark:text-moon/40">موضوع جديد</p>
                  </div>
                  <div className="flex-1 text-center bg-white dark:bg-lifted rounded-2xl py-2.5">
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{recapEvents}</p>
                    <p className="text-[9px] font-bold text-amber-600 dark:text-moon/40">فعالية</p>
                  </div>
                  <div className="flex-1 text-center bg-white dark:bg-lifted rounded-2xl py-2.5">
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{recapTrips}</p>
                    <p className="text-[9px] font-bold text-amber-600 dark:text-moon/40">رحلة جديدة</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-chamber rounded-[35px] p-6 text-white shadow-2xl relative overflow-hidden border border-white/5">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-oasis-spring rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-midnight" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">تقدّمك في الكرم</h3>
                  <p className="text-[10px] text-moon/60 uppercase font-black tracking-widest">{userProfile.rank}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-black mb-1">
                  <span className="text-white/80">الفزعات المنجزة: {userProfile.fazaCount || 0}</span>
                  <span className="text-white/80">الهدف القادم: {(userProfile.fazaCount || 0) < 3 ? '3' : (userProfile.fazaCount || 0) < 10 ? '10' : 'ماستر'}</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-oasis-spring transition-all duration-1000" style={{ width: `${Math.min(100, ((userProfile.fazaCount || 0) / ((userProfile.fazaCount || 0) < 3 ? 3 : 10)) * 100)}%` }} />
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white">{userProfile.karamPoints || 0} نقطة</span>
                </div>
                <button className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-lg text-white">سجل الفزعات</button>
              </div>
            </div>
            <Crown className="absolute -bottom-8 -right-8 w-40 h-40 text-white/5 rotate-12" />
          </div>

          <div>
            <h2 className="text-xs font-black text-slate-400 dark:text-moon/40 mb-3 uppercase tracking-[0.2em] flex items-center gap-2">
              <Users className="w-4 h-4 text-oasis-spring" /> استكشف المجالس والمجتمعات
            </h2>

            {joinedCommunities.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black text-slate-500 dark:text-moon/40 mb-2 uppercase tracking-widest">مجتمعاتي</p>
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
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-oasis-spring shadow-sm dark:shadow-black/30">
                          <img src={comm.image} className="w-full h-full object-cover" alt={comm.name} loading="lazy" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 dark:text-moon/40 text-center line-clamp-1 max-w-[60px]">{comm.name.replace(/[^\u0600-\u06FFA-Za-z0-9 ]/g, '').trim() || comm.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-lifted rounded-xl px-3 py-2.5 mb-3">
              <Search className="w-4 h-4 text-slate-400 dark:text-moon/40 shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-moon/40 text-slate-900 dark:text-white"
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

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
              {COMMUNITY_CATEGORIES.map(cat => {
                const label: Record<string, string> = {
                  'الكل': 'الكل', 'Sports': '⚽ رياضة', 'Food': '🍽️ طعام',
                  'Nature': '🌿 طبيعة', 'Cars': '🚗 سيارات',
                  'Women': '👩 نسائي', 'Men': '🧔 رجالي', 'Sea': '🌊 بحر',
                };
                const isGender = cat === 'Women' || cat === 'Men';
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-black border transition-all ${categoryFilter === cat ? isGender ? (cat === 'Women' ? 'bg-pink-500 text-white border-pink-500' : 'bg-blue-500 text-white border-blue-500') : 'bg-oasis-spring text-midnight border-transparent shadow-mint-glow' : 'bg-white dark:bg-lifted text-slate-600 dark:text-moon/60 border-slate-200 dark:border-white/10 hover:border-oasis-spring'}`}
                  >
                    {label[cat] || cat}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-2">
              {filteredCommunities.length > 0 ? (
                filteredCommunities.map(renderCommunityCard)
              ) : (
                <div className="text-center py-12 bg-white dark:bg-chamber rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                  <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-moon/20 mb-3" />
                  <h3 className="font-bold text-slate-600 dark:text-moon/40">لا توجد مجتمعات حالياً</h3>
                  <p className="text-xs text-slate-400 mt-1">لم يتم جلب أي مجالس أو مجتمعات من السيرفر</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mainTab === 'traveling' && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-moon/40 text-sm">{(t as any).ttFindCompanions || (ar ? 'ابحث عن رفاق سفر لمغامرتك القادمة!' : 'Find travel companions for your next micro-escape!')}</p>
            </div>
            <button
              onClick={() => setShowPostTripModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-oasis-spring text-midnight text-sm font-black rounded-2xl shadow-mint-glow active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4" /> {(t as any).ttPostTrip || (ar ? 'أضف رحلة' : 'Post a Trip')}
            </button>
          </div>

          {travelPosts.length > 0 && (() => {
            const userInterests = userProfile.smartProfile?.interests || [];
            const recommended = travelPosts.find(p =>
              p.userId !== userProfile.id && !p.joinedByMe && p.interests.some(i => userInterests.includes(i))
            ) || travelPosts.find(p => p.userId !== userProfile.id && !p.joinedByMe);
            if (!recommended) return null;
            const spotsLeft = recommended.maxSize - recommended.groupSize;
            const isFull = spotsLeft <= 0;
            return (
              <div className="bg-gradient-to-br from-oasis-spring/5 to-oasis-spring/10 border-2 border-oasis-spring/20 rounded-3xl p-5 shadow-sm dark:shadow-black/30">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-oasis-spring fill-oasis-spring" />
                  <span className="text-xs font-black text-oasis-spring">موصى به لك</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <img src={recommended.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${recommended.userId}`} className="w-9 h-9 rounded-full border-2 border-oasis-spring/20" alt="" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 dark:text-white text-sm">{recommended.userName}</p>
                    <p className="text-xs text-oasis-spring font-bold truncate">📍 {recommended.placeName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${spotsLeft <= 2 && !isFull ? 'bg-red-100 text-red-600' : 'bg-oasis-spring/20 text-oasis-spring'}`}>
                      {isFull ? 'مكتمل' : `${spotsLeft} متبقي`}
                    </p>
                  </div>
                </div>
                {recommended.description && <p className="text-xs text-slate-600 dark:text-moon/40 mb-3 line-clamp-2">{recommended.description}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleJoinTrip(recommended.id)}
                    disabled={isFull || recommended.joinedByMe}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${recommended.joinedByMe ? 'bg-oasis-spring/20 text-oasis-spring' : isFull ? 'bg-slate-100 dark:bg-lifted text-slate-400 cursor-not-allowed' : 'bg-oasis-spring text-midnight active:scale-95 shadow-mint-glow'}`}
                  >
                    {recommended.joinedByMe ? '✅ انضممت' : isFull ? 'مكتمل' : '🤝 انضم الآن'}
                  </button>
                </div>
              </div>
            );
          })()}

          {travelPosts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-chamber rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-bold text-slate-600 dark:text-moon/40 mb-1">{(t as any).ttNoTrips || (ar ? 'لا توجد رحلات بعد' : 'No trips posted yet')}</h3>
              <p className="text-xs text-slate-400 mb-4">{(t as any).ttBeFirst || (ar ? 'كن أول من يبحث عن رفاق!' : 'Be the first to find travel companions!')}</p>
              <button
                onClick={() => setShowPostTripModal(true)}
                className="px-5 py-2.5 bg-oasis-spring text-midnight text-sm font-bold rounded-full shadow-mint-glow"
              >
                {(t as any).ttPostYourTrip || (ar ? 'أضف رحلتك' : 'Post Your Trip')}
              </button>
            </div>
          ) : travelPosts.map(post => {
            const spotsLeft = post.maxSize - post.groupSize;
            const isFull = spotsLeft <= 0;
            const isMyPost = post.userId === userProfile.id;
            return (
              <div key={post.id} className="bg-white dark:bg-chamber rounded-3xl p-5 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-black/30">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.userId}`}
                    className="w-10 h-10 rounded-full border-2 border-slate-100 dark:border-white/5"
                    alt={post.userName}
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 dark:text-white text-sm">{post.userName}</p>
                    <p className="text-xs text-slate-500 dark:text-moon/40">{(t as any).ttIsHeadingTo || (ar ? 'متجه إلى' : 'is heading to')} <span className="font-bold text-oasis-spring">{post.placeName}</span></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.date).toLocaleDateString(ar ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {post.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{post.description}</p>
                )}

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
                          <span className={`ml-auto shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${score === 100 ? 'bg-amber-500/20 text-amber-500' : 'bg-oasis-spring/20 text-oasis-spring'}`}>
                            {score === 100 ? '⭐ ' : ''}{score}%{ar ? ' تطابق' : ' match'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(post.maxSize, 6) }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-5 rounded-full border-2 ${idx < post.groupSize ? 'bg-oasis-spring border-oasis-spring' : 'bg-slate-100 dark:bg-lifted border-slate-200 dark:border-white/5'}`}
                        />
                      ))}
                    </div>
                    {!isFull ? (
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${spotsLeft <= 2 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-oasis-spring/10 text-oasis-spring'}`}>
                        {spotsLeft} {(t as any).ttLeft || (ar ? 'متبقي' : 'left')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-lifted text-slate-500">مكتمل</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isMyPost && !isFull && !post.joinedByMe && (
                      <button
                        onClick={() => setChatDmPost(chatDmPost === post.id ? null : post.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-navy-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 active:scale-95 transition-transform"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> رسالة
                      </button>
                    )}
                    {!isMyPost && (
                      <button
                        onClick={() => handleJoinTrip(post.id)}
                        disabled={isFull || post.joinedByMe}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${post.joinedByMe ? 'bg-oasis-spring/10 text-oasis-spring cursor-default' : isFull ? 'bg-slate-100 dark:bg-lifted text-slate-400 cursor-not-allowed' : 'bg-oasis-spring text-midnight hover:bg-oasis-spring/90 active:scale-95 shadow-mint-glow'}`}
                      >
                        {post.joinedByMe ? <><CheckCircle2 className="w-3.5 h-3.5" /> {(t as any).ttJoined || (ar ? 'انضممت' : 'Joined')}</> : isFull ? ((t as any).ttFull || (ar ? 'مكتمل' : 'Full')) : <><UserPlus className="w-3.5 h-3.5" /> {(t as any).ttJoin || (ar ? 'انضم' : 'Join')}</>}
                      </button>
                    )}
                    {isMyPost && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-navy-950 px-3 py-1.5 rounded-xl">{(t as any).ttYourPost || (ar ? 'منشورك' : 'Your post')}</span>
                    )}
                  </div>
                </div>
                {chatDmPost === post.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/8 flex gap-2 animate-in slide-in-from-top duration-200">
                    <input
                      className="flex-1 bg-slate-50 dark:bg-navy-950 rounded-full px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
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
                      className="w-9 h-9 bg-oasis-spring rounded-full flex items-center justify-center text-midnight shrink-0 active:scale-90 transition-transform shadow-mint-glow"
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

      {showPostTripModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 rounded-[32px] w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setShowPostTripModal(false)}
              className="absolute top-5 right-5 p-2 bg-slate-50 dark:bg-navy-950 rounded-full"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
            <h3 className="font-black text-xl text-slate-900 dark:text-white mb-1">{(t as any).ttModalTitle || (ar ? 'أضف رحلة 🗺️' : 'Post a Trip 🗺️')}</h3>
            <p className="text-xs text-slate-400 mb-5">{(t as any).ttModalSubtitle || (ar ? 'دع الآخرين ينضمون لمغامرتك القادمة' : 'Let others join your next micro-escape')}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttPlaceLabel || (ar ? 'المكان / الوجهة *' : 'Place / Destination *')}</label>
                <input
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={(t as any).ttPlacePlaceholder || (ar ? 'مثال: حديقة البجيري التراثية' : 'e.g. Al Bujairi Heritage Park')}
                  value={newTripPost.placeName}
                  onChange={e => setNewTripPost(p => ({ ...p, placeName: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttDateLabel || (ar ? 'التاريخ *' : 'Date *')}</label>
                <input
                  type="date"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={newTripPost.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setNewTripPost(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttGroupSizeLabel || (ar ? 'حجم المجموعة الإجمالي' : 'Looking for (total group size)')}</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setNewTripPost(p => ({ ...p, maxSize: Math.max(2, p.maxSize - 1) }))}
                    className="w-9 h-9 bg-slate-100 dark:bg-navy-800 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-white/10 transition"
                  >
                    −
                  </button>
                  <span className="font-black text-lg text-slate-900 dark:text-white w-8 text-center">{newTripPost.maxSize}</span>
                  <button
                    onClick={() => setNewTripPost(p => ({ ...p, maxSize: Math.min(10, p.maxSize + 1) }))}
                    className="w-9 h-9 bg-slate-100 dark:bg-navy-800 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:bg-white/10 transition"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-400">{(t as any).ttPeopleTotal || (ar ? 'شخص إجمالاً' : 'people total')}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttDescLabel || (ar ? 'الوصف' : 'Description')}</label>
                <textarea
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder={(t as any).ttDescPlaceholder || (ar ? 'أخبر الآخرين عن خططك...' : 'Tell others about your plans...')}
                  value={newTripPost.description}
                  onChange={e => setNewTripPost(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 dark:text-slate-500 uppercase tracking-wide mb-1.5 block">{(t as any).ttInterestsLabel || (ar ? 'الاهتمامات' : 'Interests')}</label>
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
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 dark:bg-navy-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-emerald-400'}`}
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
                className="w-full py-3.5 bg-oasis-spring text-midnight font-black rounded-2xl hover:bg-oasis-spring/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-mint-glow"
              >
                {isSubmitting ? '...' : ((t as any).ttPostBtn || (ar ? 'أضف الرحلة 🤝' : 'Post Trip 🤝'))}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};