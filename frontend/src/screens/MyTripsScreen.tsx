import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Calendar, Lock, ChevronRight, Loader2, Images, X } from 'lucide-react';
import { PrivateTrip, User } from '../types/index';
import { privateTripAPI } from '../services/api';
import { CreatePrivateTripModal } from '../components/CreatePrivateTripModal';
import { showToast } from '../components/Toast';

interface TripPhoto { id: string; uploaderName: string; dataUrl: string; timestamp: number; }

const STORAGE_KEY = 'tripo_private_trips';

function loadLocalTrips(): PrivateTrip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalTrips(trips: PrivateTrip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch { /* noop */ }
}

const MOCK_PRIVATE_TRIPS: PrivateTrip[] = [
  {
    id: 'mock-pt1',
    title: 'AlUla Weekend Escape',
    startDate: '2025-03-15',
    endDate: '2025-03-17',
    members: [
      { id: 'mu1', name: 'You', email: '' },
      { id: 'mu2', name: 'Sarah', email: '' },
      { id: 'mu3', name: 'Omar', email: '' },
      { id: 'mu4', name: 'Lina', email: '' },
    ],
    chatMessages: [],
    expenses: [],
    isPrivate: true,
  },
  {
    id: 'mock-pt2',
    title: 'Abha Mountain Road Trip',
    startDate: '2025-04-05',
    endDate: '2025-04-08',
    members: [
      { id: 'mu1', name: 'You', email: '' },
      { id: 'mu5', name: 'Khalid', email: '' },
      { id: 'mu6', name: 'Nora', email: '' },
    ],
    chatMessages: [],
    expenses: [],
    isPrivate: true,
  },
  {
    id: 'mock-pt3',
    title: 'Red Sea Diving Trip',
    startDate: '2025-05-20',
    endDate: '2025-05-23',
    members: [
      { id: 'mu1', name: 'You', email: '' },
      { id: 'mu7', name: 'Faisal', email: '' },
    ],
    chatMessages: [],
    expenses: [],
    isPrivate: true,
  },
];

function mapBackendTrip(raw: any, currentUser: User): PrivateTrip {
  const members: User[] = (raw.memberIds || []).map((m: any) => ({
    id: m._id || m.id || m,
    name: m.name || 'Member',
    email: m.email || '',
    avatar: m.avatar,
  }));

  // Ensure current user is always in the list
  if (!members.find(m => m.id === currentUser.id)) {
    members.unshift(currentUser);
  }

  return {
    id: raw._id || raw.id,
    backendId: raw._id || raw.id,
    title: raw.title,
    startDate: raw.startDate,
    endDate: raw.endDate,
    organizerId: raw.organizerId?._id || raw.organizerId,
    members,
    chatMessages: [],
    expenses: [],
    isPrivate: true,
  };
}

interface Props {
  currentUser: User;
  onOpenTrip: (trip: PrivateTrip) => void;
}

export const MyTripsScreen = ({ currentUser, onOpenTrip }: Props) => {
  const [trips, setTrips] = useState<PrivateTrip[]>(() => { const local = loadLocalTrips(); return local.length > 0 ? local : MOCK_PRIVATE_TRIPS; });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [slideIdx,    setSlideIdx]    = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const touchStartX = React.useRef<number | null>(null);

  const openLightbox = (idx: number) => setLightboxIdx(idx);
  const closeLightbox = () => setLightboxIdx(null);
  const lightboxPrev = () => setLightboxIdx(i => i !== null ? (i - 1 + allSlides.length) % allSlides.length : null);
  const lightboxNext = () => setLightboxIdx(i => i !== null ? (i + 1) % allSlides.length : null);

  // Collect all photos from all trips out of localStorage
  const allSlides = useMemo(() => {
    const result: { photo: TripPhoto; tripTitle: string }[] = [];
    for (const trip of trips) {
      try {
        const raw = localStorage.getItem(`tripo_photos_${trip.id}`);
        if (raw) {
          const photos: TripPhoto[] = JSON.parse(raw);
          photos.forEach(p => result.push({ photo: p, tripTitle: trip.title }));
        }
      } catch { /* skip */ }
    }
    return result;
  }, [trips]);

  useEffect(() => {
    if (allSlides.length <= 1) return;
    const id = setInterval(() => setSlideIdx(i => (i + 1) % allSlides.length), 3500);
    return () => clearInterval(id);
  }, [allSlides.length]);

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const raw = await privateTripAPI.getMyTrips();
        const mapped = raw.map((t: any) => mapBackendTrip(t, currentUser));
        if (mapped.length > 0) {
          setTrips(mapped);
          saveLocalTrips(mapped);
        } else {
          const local = loadLocalTrips();
          setTrips(local.length > 0 ? local : MOCK_PRIVATE_TRIPS);
        }
      } catch {
        const local = loadLocalTrips();
        setTrips(local.length > 0 ? local : MOCK_PRIVATE_TRIPS);
      }
      setIsLoading(false);
    };
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const handleCreated = (raw: any) => {
    setShowCreate(false);
    const newTrip = mapBackendTrip(raw, currentUser);
    const updated = [newTrip, ...trips];
    setTrips(updated);
    saveLocalTrips(updated);
    onOpenTrip(newTrip);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Private Trips</h1>
          <p className="text-sm text-slate-500 mt-0.5">Invite-only trips with friends</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-emerald-200"
        >
          <Plus className="w-4 h-4" />
          New Trip
        </button>
      </div>

      {/* ── Trip Memories Slideshow ───────────────────────────────────────────── */}
      {allSlides.length > 0 && (
        <div className="relative h-48 overflow-hidden flex-shrink-0">
          {allSlides.map((slide, i) => (
            <button
              key={slide.photo.id}
              type="button"
              onClick={() => openLightbox(i)}
              className={`absolute inset-0 w-full text-left transition-opacity duration-700 ${i === slideIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <img src={slide.photo.dataUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-7 left-4 right-4 flex items-end justify-between">
                <div>
                  <p className="text-white text-xs font-semibold opacity-80">📍 {slide.tripTitle}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">
                    {new Date(slide.photo.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Images className="w-3.5 h-3.5 text-white/60" />
                  <span className="text-white/60 text-[10px]">{allSlides.length} memories</span>
                </div>
              </div>
            </button>
          ))}
          {/* Dot indicators */}
          {allSlides.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {allSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setSlideIdx(i); }}
                  className={`rounded-full transition-all ${i === slideIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
              <Lock className="w-9 h-9 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-700 text-lg mb-1">No private trips yet</h3>
            <p className="text-slate-400 text-sm max-w-xs">
              Create an invite-only trip to plan with friends, chat, and split expenses together.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Trip
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {trips.map(trip => (
              <button
                key={trip.id}
                onClick={() => onOpenTrip(trip)}
                className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 text-left hover:border-emerald-200 hover:shadow-md transition-all"
              >
                {/* Icon */}
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Lock className="w-6 h-6 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 truncate">{trip.title}</h3>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase flex-shrink-0">
                      Private
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {trip.members.length} members
                    </span>
                    {(trip.startDate || trip.endDate) && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(trip.startDate)}
                        {trip.endDate && trip.endDate !== trip.startDate && ` – ${formatDate(trip.endDate)}`}
                      </span>
                    )}
                  </div>

                  {/* Member avatars */}
                  <div className="flex -space-x-1.5 mt-2">
                    {trip.members.slice(0, 5).map(m => (
                      <div
                        key={m.id}
                        className="w-6 h-6 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-emerald-700 text-[9px] font-bold flex-shrink-0"
                      >
                        {m.name?.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {trip.members.length > 5 && (
                      <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500">
                        +{trip.members.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreatePrivateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Memories Lightbox ─────────────────────────────────────────────────── */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 bg-black z-50 flex flex-col"
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx < -50) lightboxNext();
            else if (dx > 50) lightboxPrev();
            touchStartX.current = null;
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-10 pb-3 flex-shrink-0">
            <span className="text-white/60 text-sm font-semibold">
              {lightboxIdx + 1} / {allSlides.length}
            </span>
            <button
              type="button"
              onClick={closeLightbox}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center active:bg-white/30"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
            {/* Prev tap zone */}
            <button
              type="button"
              onClick={lightboxPrev}
              className="absolute left-0 top-0 bottom-0 w-16 z-10"
              aria-label="Previous"
            />
            <img
              key={lightboxIdx}
              src={allSlides[lightboxIdx].photo.dataUrl}
              alt=""
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            {/* Next tap zone */}
            <button
              type="button"
              onClick={lightboxNext}
              className="absolute right-0 top-0 bottom-0 w-16 z-10"
              aria-label="Next"
            />
          </div>

          {/* Caption */}
          <div className="flex-shrink-0 px-5 py-4 pb-8">
            <p className="text-white font-semibold text-sm">📍 {allSlides[lightboxIdx].tripTitle}</p>
            <p className="text-white/50 text-xs mt-0.5">
              {allSlides[lightboxIdx].photo.uploaderName} ·{' '}
              {new Date(allSlides[lightboxIdx].photo.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          {/* Thumbnail strip */}
          <div className="flex-shrink-0 pb-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
              {allSlides.map((slide, i) => (
                <button
                  key={slide.photo.id}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                    i === lightboxIdx ? 'border-white scale-105' : 'border-transparent opacity-50'
                  }`}
                >
                  <img src={slide.photo.dataUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Dot indicators */}
          {allSlides.length > 1 && allSlides.length <= 12 && (
            <div className="flex justify-center gap-1.5 pb-4 flex-shrink-0">
              {allSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setLightboxIdx(i)}
                  className={`rounded-full transition-all ${i === lightboxIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
