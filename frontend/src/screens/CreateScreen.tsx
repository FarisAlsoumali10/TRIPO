import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, ChevronLeft, RotateCcw, Lock, Globe, UserPlus, Loader2, X,
  ChevronUp, ChevronDown, ImagePlus, MapPin, Pencil, Star, Clock,
  Sparkles, Check, ArrowRight, Search, Calendar,
} from 'lucide-react';
import { Button } from '../components/ui';
import { Itinerary, User, Place } from '../types/index';
import { itineraryAPI, privateTripAPI, placeAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { MOCK_PLACES } from './HomeScreen';

const DRAFT_KEY = 'tripo_create_draft';
const USER_TOURS_KEY = 'tripo_user_tours';

function saveUserTour(tour: any) {
  try {
    const existing = JSON.parse(localStorage.getItem(USER_TOURS_KEY) || '[]');
    existing.unshift(tour);
    localStorage.setItem(USER_TOURS_KEY, JSON.stringify(existing));
  } catch {}
}

interface TripStop {
  id: string;
  name: string;
  description: string;
  location: string;
  photos: string[];
  duration: number; // minutes
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const newStop = (): TripStop => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: '',
  description: '',
  location: '',
  photos: [],
  duration: 60,
});

const VIBE_OPTIONS = [
  { val: 'Chill', emoji: '😌' },
  { val: 'Adventure', emoji: '⛰️' },
  { val: 'Foodie', emoji: '🍽️' },
  { val: 'Cultural', emoji: '🏛️' },
  { val: 'Social', emoji: '🎉' },
  { val: 'Nature', emoji: '🌿' },
];

const STEP_LABELS = ['Basics', 'Stops', 'Details'];

export const CreateScreen = ({
  onSave,
  t,
  initialTitle,
  currentUser,
  onPrivateTripCreated,
}: {
  onSave: (it: Itinerary) => void;
  t: any;
  initialTitle?: string;
  currentUser?: User;
  onPrivateTripCreated?: (trip: any) => void;
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<'public' | 'private'>('public');
  const [title, setTitle] = useState(initialTitle || '');
  const [vibes, setVibes] = useState<string[]>([]);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const [photos, setPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Places picker
  const [places, setPlaces] = useState<Place[]>([]);
  const [showPlacesPicker, setShowPlacesPicker] = useState(false);
  const [placeSearch, setPlaceSearch] = useState('');

  // Stop form
  const [stopFormOpen, setStopFormOpen] = useState(false);
  const [editingStopIdx, setEditingStopIdx] = useState<number | null>(null);
  const [stopForm, setStopForm] = useState<TripStop>(newStop());
  const stopPhotoInputRef = useRef<HTMLInputElement>(null);

  // Friends
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<User[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);

  // Load places for picker
  useEffect(() => {
    placeAPI.getPlaces()
      .then(data => setPlaces(Array.isArray(data) && data.length > 0 ? data : MOCK_PLACES))
      .catch(() => setPlaces(MOCK_PLACES));
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.slice(0, 6 - photos.length).map(fileToDataUrl));
    setPhotos(prev => [...prev, ...dataUrls].slice(0, 6));
    e.target.value = '';
  };

  const openAddStop = () => {
    setEditingStopIdx(null);
    setStopForm(newStop());
    setShowPlacesPicker(false);
    setPlaceSearch('');
    setStopFormOpen(true);
  };

  const openEditStop = (i: number) => {
    setEditingStopIdx(i);
    setStopForm({ ...stops[i] });
    setShowPlacesPicker(false);
    setPlaceSearch('');
    setStopFormOpen(true);
  };

  const closeStopForm = () => {
    setStopFormOpen(false);
    setShowPlacesPicker(false);
    setPlaceSearch('');
  };

  const handleSaveStop = () => {
    if (!stopForm.name.trim()) { showToast('Stop name is required', 'error'); return; }
    if (editingStopIdx !== null) {
      setStops(prev => prev.map((s, i) => i === editingStopIdx ? { ...stopForm } : s));
    } else {
      setStops(prev => [...prev, { ...stopForm }]);
    }
    closeStopForm();
  };

  const handleRemoveStop = (i: number) => setStops(prev => prev.filter((_, idx) => idx !== i));

  const moveStop = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    const updated = [...stops];
    [updated[i], updated[j]] = [updated[j], updated[i]];
    setStops(updated);
  };

  const handleStopPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 4 - stopForm.photos.length;
    if (remaining <= 0) return;
    const dataUrls = await Promise.all(files.slice(0, remaining).map(fileToDataUrl));
    setStopForm(prev => ({ ...prev, photos: [...prev.photos, ...dataUrls].slice(0, 4) }));
    e.target.value = '';
  };

  const removeStopPhoto = (i: number) =>
    setStopForm(prev => ({ ...prev, photos: prev.photos.filter((_, idx) => idx !== i) }));

  // Friend search
  useEffect(() => {
    if (friendSearch.trim().length < 2) { setFriendResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearchingFriends(true);
      try {
        const results = await privateTripAPI.searchUsers(friendSearch.trim());
        const invited = new Set(invitedUsers.map(u => u.id));
        setFriendResults(results.filter((u: User) => !invited.has(u.id)));
      } catch { setFriendResults([]); }
      setIsSearchingFriends(false);
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendSearch]);

  const addFriend = (u: User) => {
    setInvitedUsers(prev => [...prev, u]);
    setFriendResults(prev => prev.filter(r => r.id !== u.id));
    setFriendSearch('');
  };
  const removeFriend = (id: string) => setInvitedUsers(prev => prev.filter(u => u.id !== id));

  // Draft
  useEffect(() => {
    if (initialTitle) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.title || (draft.stops && draft.stops.length > 0)) {
          setTitle(draft.title || '');
          setStops(draft.stops || []);
          setStartDate(draft.startDate || '');
          setEndDate(draft.endDate || '');
          setVibes(draft.vibes || []);
          setHasDraft(true);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (title || stops.length > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, stops, startDate, endDate, vibes }));
    }
  }, [title, stops, startDate, endDate, vibes]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle(''); setStops([]); setStartDate(''); setEndDate(''); setVibes([]);
    setHasDraft(false);
  };

  // Computed
  const totalMinutes = stops.reduce((sum, s) => sum + (s.duration || 60), 0) + Math.max(0, stops.length - 1) * 15;
  const estimatedHours = (totalMinutes / 60).toFixed(1);
  const tripDays = startDate && endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
    : null;
  const heroImage = photos[0] || stops.find(s => s.photos[0])?.photos[0] || null;

  const filteredPlaces = places.filter(p =>
    !placeSearch ||
    p.name?.toLowerCase().includes(placeSearch.toLowerCase()) ||
    p.city?.toLowerCase().includes(placeSearch.toLowerCase())
  );

  // Publish
  const handleCreate = async () => {
    if (!title || stops.length === 0) return;
    setPublishError(null);
    setIsPublishing(true);
    try {
      const payload: any = {
        title, city: 'Riyadh', distance: 0, places: [],
        stops: stops.map((s, i) => ({ order: i + 1, name: s.name, description: s.description, location: s.location, photos: s.photos, duration: s.duration })),
        estimatedCost: 0, estimatedDuration: totalMinutes, tags: vibes,
      };
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;
      if (photos.length) payload.photos = photos;
      const saved = await itineraryAPI.createItinerary(payload);
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      saveUserTour({
        id: `user-tour-${saved._id || saved.id || Date.now()}`,
        itineraryId: saved._id || saved.id,
        title,
        description: stops.map(s => s.description).filter(Boolean).join(' · ') || title,
        highlights: stops.map(s => s.name).filter(Boolean),
        heroImage: photos[0] || stops.find(s => s.photos[0])?.photos[0] || 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
        images: photos.slice(1),
        pricePerPerson: 0, currency: 'SAR', maxGroupSize: 20, minGroupSize: 1,
        stops: stops.map((s, i) => ({ order: i + 1, placeName: s.name || `Stop ${i + 1}`, duration: s.duration || 60, description: s.description || '', image: s.photos[0] })),
        departureLocation: stops[0]?.location || 'Saudi Arabia',
        departureTime: startDate ? new Date(startDate).toLocaleDateString('en-SA', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Flexible',
        totalDuration: Math.round(totalMinutes / 60),
        difficulty: 'easy' as const, included: [], excluded: [],
        guideName: currentUser?.name || 'Community Member',
        guideAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name || 'user'}`,
        category: vibes[0] || 'Community',
        tags: ['community', 'user-created', ...vibes],
        rating: undefined, reviewCount: 0, createdAt: new Date().toISOString(),
      });
      setPublishSuccess(true);
      showToast('Trip published!', 'success');
      setTimeout(() => {
        setPublishSuccess(false);
        setTitle(''); setStops([]); setStartDate(''); setEndDate(''); setPhotos([]); setVibes([]);
        setStep(1);
        onSave(saved);
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to publish. Please try again.';
      setPublishError(msg);
      showToast(msg, 'error');
    } finally { setIsPublishing(false); }
  };

  const handleCreatePrivate = async () => {
    if (!title.trim()) { showToast('Please enter a trip name', 'error'); return; }
    setIsPublishing(true);
    try {
      const trip = await privateTripAPI.create({
        title: title.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        inviteIds: invitedUsers.map(u => u.id),
        stops: stops.map((s, i) => ({ order: i + 1, name: s.name, description: s.description, location: s.location, photos: s.photos, duration: s.duration })),
      } as any);
      showToast('Private trip created!', 'success');
      localStorage.removeItem(DRAFT_KEY);
      setTitle(''); setStops([]); setStartDate(''); setEndDate(''); setPhotos([]);
      setInvitedUsers([]); setHasDraft(false); setStep(1);
      onPrivateTripCreated?.(trip);
    } catch {
      showToast('Failed to create private trip', 'error');
    } finally { setIsPublishing(false); }
  };

  const goNext = () => {
    if (step === 1 && !title.trim()) { showToast('Please enter a trip title', 'error'); return; }
    setStep(s => (s + 1) as 1 | 2 | 3);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <div className="relative flex-shrink-0 overflow-hidden" style={{ minHeight: 130 }}>
        {heroImage ? (
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/75" />
        <div className="relative z-10 px-5 pt-5 pb-4" style={{ minHeight: 130 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">
                {t.newItinerary || 'New Trip'}
              </span>
            </div>
            {hasDraft && (
              <button onClick={clearDraft} className="flex items-center gap-1 text-white/50 hover:text-white text-[10px] font-bold transition-colors">
                <RotateCcw className="w-3 h-3" /> Clear draft
              </button>
            )}
          </div>
          <h1 className={`text-xl font-black leading-tight drop-shadow ${title ? 'text-white' : 'text-white/30'}`}>
            {title || (t.tripTitlePlaceholder || 'Your trip title...')}
          </h1>
          {vibes.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {vibes.map(v => {
                const opt = VIBE_OPTIONS.find(o => o.val === v);
                return (
                  <span key={v} className="text-[10px] font-bold bg-white/15 text-white px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
                    {opt?.emoji} {v}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Progress Stepper ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center">
          {STEP_LABELS.map((label, idx) => {
            const s = idx + 1;
            const active = step === s;
            const done = step > s;
            return (
              <React.Fragment key={s}>
                <button
                  onClick={() => { if (done) setStep(s as 1 | 2 | 3); }}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                    done ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                    : active ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                    : 'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className={`text-[10px] font-black transition-colors ${active ? 'text-emerald-600' : done ? 'text-slate-400' : 'text-slate-300'}`}>
                    {label}
                  </span>
                </button>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-colors duration-500 ${done ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Step Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── STEP 1: BASICS ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-5 space-y-6">

            {hasDraft && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <p className="text-xs font-bold text-amber-700">Draft restored from your last session.</p>
              </div>
            )}

            {/* Trip type visual cards */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Trip Type</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    val: 'public' as const,
                    icon: <Globe className="w-5 h-5 text-emerald-600" />,
                    iconBg: 'bg-emerald-100',
                    title: 'Public',
                    desc: 'Share with the community & earn Karam points',
                  },
                  {
                    val: 'private' as const,
                    icon: <Lock className="w-5 h-5 text-slate-600" />,
                    iconBg: 'bg-slate-100',
                    title: 'Private',
                    desc: 'Invite-only — your Shella sees it',
                  },
                ] as const).map(opt => {
                  const active = mode === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setMode(opt.val)}
                      className={`relative p-4 rounded-3xl border-2 text-left transition-all duration-200 ${
                        active ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100' : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      {active && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 ${opt.iconBg} rounded-2xl flex items-center justify-center mb-3`}>
                        {opt.icon}
                      </div>
                      <p className="font-black text-slate-900 text-sm mb-1">{opt.title}</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip name */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                {t.tripTitle || 'Trip Title'} <span className="text-red-400">*</span>
              </p>
              <div className="relative">
                <input
                  type="text"
                  placeholder={mode === 'private'
                    ? 'e.g. Riyadh Weekend with the Crew'
                    : (t.tripTitlePlaceholder || 'e.g. Saturday Sunrise Walk')}
                  value={title}
                  maxLength={60}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-emerald-500 text-sm font-bold text-slate-900 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400"
                />
                <span className="absolute right-3.5 bottom-3.5 text-[10px] text-slate-300 font-bold">
                  {title.length}/60
                </span>
              </div>
            </div>

            {/* Cover photos */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Cover Photos <span className="font-normal text-slate-300 normal-case">(up to 6)</span>
              </p>
              <div className="flex gap-2.5 flex-wrap">
                {photos.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 flex-shrink-0 shadow-sm">
                    <img src={src} className="w-full h-full object-cover" alt="" />
                    {i === 0 && (
                      <div className="absolute bottom-0 inset-x-0 bg-emerald-500 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-wide">
                        Cover
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex-shrink-0"
                  >
                    <ImagePlus className="w-5 h-5 text-slate-300" />
                    <span className="text-[10px] font-bold text-slate-300">Add</span>
                  </button>
                )}
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
            </div>

            {/* Vibe tags */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Trip Vibe <span className="font-normal text-slate-300 normal-case">(pick all that apply)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map(opt => {
                  const active = vibes.includes(opt.val);
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setVibes(prev => active ? prev.filter(v => v !== opt.val) : [...prev, opt.val])}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black border-2 transition-all duration-200 ${
                        active
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-105'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                      }`}
                    >
                      <span className="text-sm">{opt.emoji}</span> {opt.val}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: STOPS ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-slate-900 text-base">Build Your Itinerary</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {stops.length} stop{stops.length !== 1 ? 's' : ''} · ~{estimatedHours}h estimated
                </p>
              </div>
              {stops.length > 0 && (
                <button
                  onClick={openAddStop}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-full shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Stop
                </button>
              )}
            </div>

            {stops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="font-black text-slate-700 mb-1">No stops yet</p>
                <p className="text-xs text-slate-400 mb-5">Add places to visit on your trip</p>
                <button
                  onClick={openAddStop}
                  className="flex items-center gap-2 px-7 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add First Stop
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline connector */}
                <div className="absolute left-[1.6rem] top-9 bottom-9 w-0.5 bg-gradient-to-b from-emerald-400 via-teal-300 to-slate-100 rounded-full z-0" />

                <div className="space-y-3">
                  {stops.map((stop, i) => (
                    <div key={stop.id} className="flex gap-3 relative">
                      {/* Numbered circle */}
                      <div className="flex-shrink-0 z-10">
                        <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-sm bg-white ${i === 0 ? 'border-emerald-500' : i === stops.length - 1 ? 'border-teal-400' : 'border-emerald-400'}`}>
                          {stop.photos[0] ? (
                            <img src={stop.photos[0]} className="w-full h-full object-cover rounded-full" alt="" />
                          ) : (
                            <span className="text-xs font-black text-emerald-600">{i + 1}</span>
                          )}
                        </div>
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex items-stretch">
                          {stop.photos.length > 0 && (
                            <div className="relative w-16 flex-shrink-0">
                              <img src={stop.photos[0]} className="w-full h-full object-cover" alt="" />
                              {stop.photos.length > 1 && (
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <span className="text-white text-[9px] font-black">+{stop.photos.length - 1}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex-1 p-3 min-w-0">
                            <div className="flex items-start gap-1">
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-900 text-sm truncate">{stop.name}</p>
                                {stop.location && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5 truncate">
                                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" /> {stop.location}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    <Clock className="w-2.5 h-2.5" /> {stop.duration} min
                                  </span>
                                  {stop.description && (
                                    <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{stop.description}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                                <button onClick={() => openEditStop(i)} className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleRemoveStop(i)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex flex-col gap-0">
                                  <button onClick={() => moveStop(i, -1)} disabled={i === 0} className="p-0.5 text-slate-300 hover:text-emerald-600 disabled:opacity-20 transition-colors">
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => moveStop(i, 1)} disabled={i === stops.length - 1} className="p-0.5 text-slate-300 hover:text-emerald-600 disabled:opacity-20 transition-colors">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: DETAILS ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="p-5 space-y-6">

            {/* Smart summary card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-5 text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
              <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-4 relative z-10">Trip Summary</p>
              <div className="grid grid-cols-3 gap-3 relative z-10">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black">{stops.length}</p>
                  <p className="text-[10px] text-white/60 font-bold mt-0.5">Stops</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black">{estimatedHours}h</p>
                  <p className="text-[10px] text-white/60 font-bold mt-0.5">Estimated</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black">{tripDays ?? '—'}</p>
                  <p className="text-[10px] text-white/60 font-bold mt-0.5">Days</p>
                </div>
              </div>
              {vibes.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap relative z-10">
                  {vibes.map(v => {
                    const opt = VIBE_OPTIONS.find(o => o.val === v);
                    return (
                      <span key={v} className="text-[10px] font-bold bg-white/15 border border-white/10 px-2.5 py-0.5 rounded-full">
                        {opt?.emoji} {v}
                      </span>
                    );
                  })}
                </div>
              )}
              {mode === 'public' && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-white/70 font-bold relative z-10 border-t border-white/10 pt-3">
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  Publishing earns you +100 Karam points
                </div>
              )}
            </div>

            {/* Dates */}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                Trip Dates <span className="font-normal text-slate-300 normal-case">(optional)</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-3.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">Start</p>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-sm font-bold text-slate-900 outline-none bg-transparent"
                  />
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-3.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-2">End</p>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-sm font-bold text-slate-900 outline-none bg-transparent"
                  />
                </div>
              </div>
              {tripDays !== null && tripDays > 0 && (
                <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
                  📅 {tripDays} day{tripDays !== 1 ? 's' : ''} trip
                </p>
              )}
            </div>

            {/* Invite friends (private only) */}
            {mode === 'private' && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Invite Friends
                </p>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={friendSearch}
                    onChange={e => setFriendSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {isSearchingFriends && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
                </div>
                {friendResults.length > 0 && (
                  <div className="mt-2 bg-white border border-slate-100 rounded-2xl shadow-lg overflow-hidden">
                    {friendResults.map(u => (
                      <button key={u.id} type="button" onClick={() => addFriend(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left border-b border-slate-50 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-black flex-shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                        <span className="text-xs font-black text-emerald-600 flex-shrink-0">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
                {invitedUsers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {invitedUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-[9px] font-black">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-emerald-800">{u.name.split(' ')[0]}</span>
                        <button type="button" onClick={() => removeFriend(u.id)} className="text-emerald-400 hover:text-emerald-600 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {invitedUsers.length === 0 && !friendSearch && (
                  <p className="text-xs text-slate-400 mt-2">You can invite friends after creating the trip too.</p>
                )}
              </div>
            )}

            {publishError && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <p className="text-red-600 text-xs font-bold">{publishError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer Navigation ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
        {step > 1 && (
          <button
            onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-100 text-slate-700 font-black rounded-2xl hover:bg-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {step < 3 ? (
          <button
            onClick={goNext}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : mode === 'public' ? (
          <button
            onClick={handleCreate}
            disabled={!title || stops.length === 0 || isPublishing}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 font-black rounded-2xl transition-all shadow-lg active:scale-95 ${
              publishSuccess
                ? 'bg-emerald-700 text-white shadow-emerald-300'
                : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-200 hover:from-emerald-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
            }`}
          >
            {isPublishing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</>
            ) : publishSuccess ? (
              <><Check className="w-4 h-4" /> Published!</>
            ) : (
              <><Globe className="w-4 h-4" /> {t.publishBtn || 'Publish Trip'}</>
            )}
          </button>
        ) : (
          <button
            onClick={handleCreatePrivate}
            disabled={!title.trim() || isPublishing}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : (
              <><Lock className="w-4 h-4" /> Create Private Trip</>
            )}
          </button>
        )}
      </div>

      {/* ── Stop Form Overlay ─────────────────────────────────────────── */}
      {stopFormOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">

          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-white shadow-sm flex-shrink-0">
            <button onClick={closeStopForm} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <h2 className="text-base font-black text-slate-900">
                {editingStopIdx !== null ? 'Edit Stop' : 'Add Stop'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Stop {editingStopIdx !== null ? editingStopIdx + 1 : stops.length + 1}
              </p>
            </div>
            {!showPlacesPicker && (
              <button
                onClick={handleSaveStop}
                disabled={!stopForm.name.trim()}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save
              </button>
            )}
          </div>

          {/* Tabs: Manual / Pick from Places */}
          <div className="flex border-b border-slate-100 bg-white flex-shrink-0">
            <button
              onClick={() => setShowPlacesPicker(false)}
              className={`flex-1 py-3 text-xs font-black border-b-2 transition-colors ${!showPlacesPicker ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              ✍️ Enter Manually
            </button>
            <button
              onClick={() => setShowPlacesPicker(true)}
              className={`flex-1 py-3 text-xs font-black border-b-2 transition-colors ${showPlacesPicker ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              📍 Pick from Places
            </button>
          </div>

          {showPlacesPicker ? (
            /* ── Places Picker ── */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search places..."
                    value={placeSearch}
                    onChange={e => setPlaceSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {filteredPlaces.slice(0, 40).map(p => {
                  const img = p.photos?.[0] || p.image;
                  const rating = p.ratingSummary?.avgRating ?? p.rating;
                  return (
                    <button
                      key={p._id || p.id}
                      onClick={() => {
                        setStopForm(prev => ({ ...prev, name: p.name || '', location: p.city || '' }));
                        setShowPlacesPicker(false);
                        setPlaceSearch('');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-emerald-50 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {img ? (
                          <img src={img} className="w-full h-full object-cover" alt={p.name}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 truncate">{p.city || 'Saudi Arabia'}</p>
                      </div>
                      {rating && (
                        <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 flex-shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {Number(rating).toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                })}
                {filteredPlaces.length === 0 && (
                  <div className="py-16 text-center">
                    <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400 font-medium">No places found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ── Manual Form ── */
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">

              {/* Stop name */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Stop Name <span className="text-red-400">*</span>
                </p>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Al Balad Old Town, Coffee Shop..."
                  value={stopForm.name}
                  onChange={e => setStopForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-emerald-500 text-sm font-bold text-slate-900 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {/* Location */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location / Area</p>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Al Diriyah, Riyadh"
                    value={stopForm.location}
                    onChange={e => setStopForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full pl-9 pr-4 py-4 bg-white rounded-2xl border-2 border-slate-100 focus:border-emerald-500 text-sm outline-none transition-colors placeholder:text-slate-400"
                  />
                </div>
                {stopForm.location.trim() && (
                  <a
                    href={`https://www.google.com/maps/search/${encodeURIComponent(stopForm.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1.5 hover:underline"
                  >
                    <MapPin className="w-3 h-3" /> Preview on Google Maps
                  </a>
                )}
              </div>

              {/* Duration */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Time at This Stop
                </p>
                <div className="bg-white rounded-2xl border-2 border-slate-100 px-4 py-3 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setStopForm(prev => ({ ...prev, duration: Math.max(15, prev.duration - 15) }))}
                    className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600 text-lg hover:bg-slate-200 transition flex-shrink-0"
                  >−</button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-black text-slate-900">{stopForm.duration}</span>
                    <span className="text-sm text-slate-400 ml-1.5">min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStopForm(prev => ({ ...prev, duration: Math.min(480, prev.duration + 15) }))}
                    className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-600 text-lg hover:bg-slate-200 transition flex-shrink-0"
                  >+</button>
                </div>
                <div className="flex gap-2 mt-2">
                  {[30, 60, 90, 120].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setStopForm(prev => ({ ...prev, duration: d }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                        stopForm.duration === d
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes / Description</p>
                <textarea
                  rows={3}
                  placeholder="What to do here, tips, must-tries, opening hours..."
                  value={stopForm.description}
                  onChange={e => setStopForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-white rounded-2xl border-2 border-slate-100 focus:border-emerald-500 text-sm outline-none transition-colors resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Stop photos */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Photos <span className="font-normal text-slate-300 normal-case">(up to 4)</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {stopForm.photos.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm">
                      <img src={src} className="w-full h-full object-cover" alt="" />
                      <button
                        type="button"
                        onClick={() => removeStopPhoto(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                  {stopForm.photos.length < 4 && (
                    <button
                      type="button"
                      onClick={() => stopPhotoInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex-shrink-0"
                    >
                      <ImagePlus className="w-4 h-4 text-slate-300" />
                      <span className="text-[9px] font-black text-slate-300">Add</span>
                    </button>
                  )}
                </div>
                <input ref={stopPhotoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleStopPhotoSelect} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
