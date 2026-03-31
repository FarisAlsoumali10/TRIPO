import React, { useState } from 'react';
import { ChevronLeft, Heart, Clock, Wallet, Users, Download, Copy, WifiOff } from 'lucide-react';

const WISHLIST_KEY = 'tripo_wishlist_itineraries';
function getWishlist(): string[] {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch { return []; }
}
function toggleWishlist(id: string): boolean {
  const list = getWishlist();
  const idx = list.indexOf(id);
  if (idx === -1) { list.push(id); localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); return true; }
  list.splice(idx, 1); localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); return false;
}
import { Button } from '../components/ui';
import { Itinerary } from '../types/index';
import { itineraryAPI } from '../services/api';
import { showToast } from '../components/Toast';

// ==========================================
// Offline Trips Helpers (used by App.tsx)
// ==========================================
const OFFLINE_KEY = 'tripo_offline_trips';

export function getOfflineItineraries(): Itinerary[] {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveOfflineItinerary(itinerary: Itinerary) {
  try {
    const existing = getOfflineItineraries();
    const id = itinerary._id || itinerary.id || '';
    const filtered = existing.filter(i => (i._id || i.id) !== id);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify([itinerary, ...filtered].slice(0, 20)));
  } catch { /* noop */ }
}

export function removeOfflineItinerary(id: string) {
  try {
    const existing = getOfflineItineraries();
    const updated = existing.filter(i => (i._id || i.id) !== id);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(updated));
  } catch { /* noop */ }
}

// ==========================================
// Component
// ==========================================
export const ItineraryDetailScreen = ({
  itinerary,
  onBack,
  onStartGroup,
  t,
  onAwardKaramPoints,
}: {
  itinerary: Itinerary;
  onBack: () => void;
  onStartGroup: () => void;
  t: any;
  onAwardKaramPoints?: (action: string, points: number, label: string) => void;
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const itineraryId = itinerary._id || itinerary.id || '';
  const [isWishlisted, setIsWishlisted] = useState(() => getWishlist().includes(itineraryId));

  const heroImage =
    itinerary.places?.[0]?.image ||
    (itinerary.places?.[0]?.placeId as any)?.photos?.[0] ||
    'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800';

  const totalDuration = itinerary.estimatedDuration ?? itinerary.totalDuration ?? 0;
  const totalCost = itinerary.estimatedCost ?? itinerary.totalCost ?? 0;

  const handleSaveOffline = () => {
    saveOfflineItinerary(itinerary);
    setIsSaved(true);
    showToast('Trip saved for offline use!', 'success');
    onAwardKaramPoints?.('save_offline', 10, 'Saved a trip offline');
  };

  const handleDuplicate = async () => {
    try {
      const copy = await itineraryAPI.createItinerary({
        title: `Copy of ${itinerary.title}`,
        estimatedDuration: totalDuration,
        estimatedCost: totalCost,
        distance: itinerary.distance ?? 0,
        city: itinerary.city ?? '',
        places: (itinerary.places ?? []).map((p: any, idx: number) => ({
          placeId: p.placeId?._id || p.placeId?.id || p.placeId || p.id || p._id,
          order: idx + 1,
          timeSlot: p.timeSlot,
          notes: p.notes,
        })),
        notes: itinerary.notes,
      });
      showToast('Trip duplicated!', 'success');
      onAwardKaramPoints?.('duplicate_trip', 25, 'Duplicated a trip');
    } catch {
      showToast('Could not duplicate trip', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto pb-24 relative">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
        >
          <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
            title="Duplicate trip"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={handleSaveOffline}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center text-white ${isSaved ? 'bg-emerald-500/80' : 'bg-white/20'}`}
            title="Save offline"
          >
            {isSaved ? <WifiOff className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          </button>
          <button
            onClick={() => {
              const saved = toggleWishlist(itineraryId);
              setIsWishlisted(saved);
              showToast(saved ? 'Added to wishlist!' : 'Removed from wishlist', saved ? 'success' : 'info');
            }}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${isWishlisted ? 'bg-rose-500/80' : 'bg-white/20'}`}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-white text-white' : 'text-white'}`} />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="h-64 w-full shrink-0 relative bg-slate-200">
        <img src={heroImage} className="w-full h-full object-cover" alt={itinerary.title} />
      </div>

      {/* Content */}
      <div className="px-5 py-6 -mt-6 bg-white rounded-t-3xl relative z-0 flex-1">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 mr-3">
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">{itinerary.title}</h1>
            {(itinerary.authorName || (itinerary.userId as any)?.name) && (
              <p className="text-slate-500 text-sm mt-1">
                {t.curatedBy} {itinerary.authorName || (itinerary.userId as any)?.name}
              </p>
            )}
          </div>
          {itinerary.isVerified && (
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex-shrink-0">
              VERIFIED
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-3 my-5">
          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
            <Clock className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="font-bold text-slate-800 text-sm" style={{ direction: 'ltr' }}>
              {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </span>
            <span className="text-xs text-slate-500">{t.durationLabel || 'Duration'}</span>
          </div>
          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="font-bold text-slate-800 text-sm" style={{ direction: 'ltr' }}>{totalCost} SAR</span>
            <span className="text-xs text-slate-500">{t.costLabel || 'Cost'}</span>
          </div>
          <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
            <Users className="w-5 h-5 text-emerald-600 mb-1" />
            <span className="font-bold text-slate-800 text-sm">{itinerary.places?.length ?? 0}</span>
            <span className="text-xs text-slate-500">{t.stopsLabelCaps || 'Stops'}</span>
          </div>
        </div>

        {/* Plan */}
        <h3 className="font-bold text-lg mb-4">{t.thePlan || 'The Plan'}</h3>
        {(!itinerary.places || itinerary.places.length === 0) ? (
          <div className="text-center py-8 text-slate-400 text-sm">No stops added yet.</div>
        ) : (
          <div className="space-y-6 relative pl-4 border-l-2 border-slate-100 ml-3 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-4 rtl:ml-0 rtl:mr-3">
            {itinerary.places.map((place: any, idx: number) => {
              const p = place.placeId ?? place;
              const name = p?.name || place?.name || `Stop ${idx + 1}`;
              const image = p?.photos?.[0] || p?.image || place?.image;
              const category = p?.categoryTags?.[0] || p?.category || '';
              const cost = p?.avgCost ?? '';
              const duration = p?.duration ?? '';
              return (
                <div key={idx} className="relative pl-6 rtl:pl-0 rtl:pr-6">
                  <div className="absolute -left-[29px] top-0 w-8 h-8 rounded-full border-4 border-white bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm rtl:-right-[29px] rtl:left-auto">
                    {idx + 1}
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3">
                    {image ? (
                      <img src={image} className="w-16 h-16 rounded-lg object-cover bg-slate-200 flex-shrink-0" alt={name} />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{name}</h4>
                      {category && <p className="text-xs text-slate-500 mb-1">{category}</p>}
                      {(cost || duration) && (
                        <p className="text-xs font-medium text-emerald-700">
                          {cost ? `${cost} SAR` : ''}
                          {cost && duration ? ' • ' : ''}
                          {duration ? `${duration} min` : ''}
                        </p>
                      )}
                      {place.timeSlot && (
                        <p className="text-xs text-slate-400 mt-0.5">{place.timeSlot}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-24" />
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-100 max-w-2xl mx-auto right-0">
        <Button className="w-full shadow-emerald-200 shadow-xl" onClick={onStartGroup}>
          {t.startGroupBtn || 'Start Group Trip'}
        </Button>
      </div>
    </div>
  );
};
