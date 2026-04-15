// frontend/src/screens/MyTripsScreen.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Users, Calendar, Lock, ChevronRight, Images, X, MapPin } from 'lucide-react';
import { PrivateTrip, User } from '../types/index';
import { privateTripAPI } from '../services/api';
import { CreatePrivateTripModal } from '../components/CreatePrivateTripModal';
import { showToast } from '../components/Toast';

export interface TripPhoto {
  id: string;
  uploaderName: string;
  dataUrl: string;
  timestamp: number;
}

// Assuming your PrivateTrip type is extended to include photos from the backend
export interface ExtendedPrivateTrip extends PrivateTrip {
  photos?: TripPhoto[];
}

function mapBackendTrip(raw: any, currentUser: User): ExtendedPrivateTrip {
  const members: User[] = (raw.memberIds || []).map((m: any) => ({
    id: m._id || m.id || m,
    name: m.name || 'Member',
    email: m.email || '',
    avatar: m.avatar,
  }));

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
    photos: raw.photos || [], // Data contract: Backend provides photos
  };
}

interface Props {
  currentUser: User;
  onOpenTrip: (trip: ExtendedPrivateTrip) => void;
}

export const MyTripsScreen = ({ currentUser, onOpenTrip }: Props) => {
  const [trips, setTrips] = useState<ExtendedPrivateTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Slideshow & Lightbox state
  const [slideIdx, setSlideIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Derive photos strictly from backend state, no localStorage
  const allSlides = useMemo(() => {
    const result: { photo: TripPhoto; tripTitle: string }[] = [];
    trips.forEach(trip => {
      if (trip.photos && Array.isArray(trip.photos)) {
        trip.photos.forEach(photo => result.push({ photo, tripTitle: trip.title }));
      }
    });
    // Sort by newest first
    return result.sort((a, b) => b.photo.timestamp - a.photo.timestamp);
  }, [trips]);

  // Auto-advance slideshow
  useEffect(() => {
    if (allSlides.length <= 1) return;
    const id = setInterval(() => setSlideIdx(i => (i + 1) % allSlides.length), 4000);
    return () => clearInterval(id);
  }, [allSlides.length]);

  // Strict backend fetch
  useEffect(() => {
    let isMounted = true;
    const fetchTrips = async () => {
      setIsLoading(true);
      try {
        const raw = await privateTripAPI.getMyTrips();
        if (!isMounted) return;

        const mapped = raw.map((t: any) => mapBackendTrip(t, currentUser));
        setTrips(mapped);
      } catch (error) {
        if (isMounted) showToast('Failed to load your trips. Please try again.', 'error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchTrips();
    return () => { isMounted = false; };
  }, [currentUser.id]);

  const handleCreated = (raw: any) => {
    setShowCreate(false);
    const newTrip = mapBackendTrip(raw, currentUser);
    setTrips(prev => [newTrip, ...prev]);
    onOpenTrip(newTrip);
    showToast('Trip created successfully!', 'success');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const lightboxPrev = () => setLightboxIdx(i => i !== null ? (i - 1 + allSlides.length) % allSlides.length : null);
  const lightboxNext = () => setLightboxIdx(i => i !== null ? (i + 1) % allSlides.length : null);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header - Sticky with Backdrop Blur */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Private Trips</h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">Plan and split expenses with friends</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-95 shadow-sm shadow-emerald-600/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Trip</span>
        </button>
      </div>

      {/* Memory Slideshow */}
      {!isLoading && allSlides.length > 0 && (
        <div className="relative h-56 mx-4 mt-4 rounded-3xl overflow-hidden shadow-sm border border-slate-200/60 group">
          {allSlides.map((slide, i) => (
            <button
              key={slide.photo.id}
              type="button"
              onClick={() => setLightboxIdx(i)}
              className={`absolute inset-0 w-full text-left transition-opacity duration-1000 ease-in-out ${i === slideIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            >
              <img src={slide.photo.dataUrl} alt="Trip Memory" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-white text-sm font-bold drop-shadow-md">{slide.tripTitle}</p>
                  </div>
                  <p className="text-white/70 text-xs font-medium">
                    {new Date(slide.photo.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full">
                  <Images className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-white/80 text-xs font-bold">{allSlides.length}</span>
                </div>
              </div>
            </button>
          ))}
          {/* Pagination Dots */}
          {allSlides.length > 1 && (
            <div className="absolute top-4 right-4 flex gap-1.5 z-20">
              {allSlides.map((_, i) => (
                <div
                  key={i}
                  className={`transition-all duration-300 rounded-full ${i === slideIdx ? 'w-5 h-1.5 bg-white shadow-sm' : 'w-1.5 h-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-full bg-white rounded-3xl border border-slate-100 p-4 flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-100 animate-pulse rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 animate-pulse rounded-md w-1/3" />
                  <div className="h-3 bg-slate-100 animate-pulse rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mb-5 rotate-3 shadow-inner">
              <Lock className="w-8 h-8 text-emerald-500 -rotate-3" />
            </div>
            <h3 className="font-black text-slate-900 text-lg mb-2">No private trips yet</h3>
            <p className="text-slate-500 text-sm max-w-[260px] leading-relaxed mb-8">
              Create an invite-only trip to organize itineraries, chat, and split expenses securely with friends.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create First Trip
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {trips.map(trip => (
              <button
                key={trip.id}
                onClick={() => onOpenTrip(trip)}
                className="group w-full bg-white rounded-3xl border border-slate-200/60 shadow-sm p-4 flex items-center gap-4 text-left hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 transition-all"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-50 transition-colors">
                  <Lock className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-slate-900 text-base truncate pr-2 group-hover:text-emerald-700 transition-colors">
                      {trip.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      {(trip.startDate || trip.endDate) && (
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(trip.startDate)}
                          {trip.endDate && trip.endDate !== trip.startDate && ` – ${formatDate(trip.endDate)}`}
                        </span>
                      )}
                    </div>

                    {/* Compact Avatar Stack */}
                    <div className="flex items-center">
                      <div className="flex -space-x-2 mr-2">
                        {trip.members.slice(0, 3).map(m => (
                          <img
                            key={m.id}
                            src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.id}`}
                            className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 object-cover"
                            alt={m.name}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        {trip.members.length}
                      </div>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-300 shrink-0 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreatePrivateTripModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Modern Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-200"
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (dx < -40) lightboxNext();
            else if (dx > 40) lightboxPrev();
            touchStartX.current = null;
          }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 pt-12 pb-4 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full">
              <Images className="w-4 h-4 text-white/80" />
              <span className="text-white/80 text-xs font-bold tracking-widest">
                {lightboxIdx + 1} / {allSlides.length}
              </span>
            </div>
            <button
              onClick={() => setLightboxIdx(null)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Main Photo Area */}
          <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative group">
            <button
              onClick={lightboxPrev}
              className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden sm:flex z-10"
            >
              <ChevronRight className="w-6 h-6 text-white rotate-180" />
            </button>

            <img
              key={lightboxIdx} // forces animation re-trigger if needed
              src={allSlides[lightboxIdx].photo.dataUrl}
              alt="Memory"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />

            <button
              onClick={lightboxNext}
              className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 hidden sm:flex z-10"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Metadata & Thumbnails */}
          <div className="shrink-0 pt-6 pb-10 px-6">
            <div className="mb-6 text-center">
              <h4 className="text-white font-bold text-lg mb-1 drop-shadow-sm">
                {allSlides[lightboxIdx].tripTitle}
              </h4>
              <p className="text-white/60 text-xs font-medium">
                Added by {allSlides[lightboxIdx].photo.uploaderName} • {new Date(allSlides[lightboxIdx].photo.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex justify-center gap-2 overflow-x-auto no-scrollbar max-w-2xl mx-auto">
              {allSlides.map((slide, i) => (
                <button
                  key={slide.photo.id}
                  onClick={() => setLightboxIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 ${i === lightboxIdx ? 'ring-2 ring-white scale-110 opacity-100' : 'opacity-40 hover:opacity-70'
                    }`}
                >
                  <img src={slide.photo.dataUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};