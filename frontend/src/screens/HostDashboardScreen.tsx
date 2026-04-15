import React, { useState, useEffect, useMemo } from 'react';
import { Store, CheckCircle, Clock, Eye, Bookmark, MessageSquare, Send, X, ChevronDown, ChevronUp, Tag, Star } from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface ClaimedPlace {
  placeId: string;
  businessName: string;
  role: string;
  email: string;
  claimedAt: string;
}

interface HoursEntry {
  open: string;
  close: string;
  closed: boolean;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── helpers ─────────────────────────────────────────────────────────────────

const getClaimedPlaces = (): ClaimedPlace[] => {
  try { return JSON.parse(localStorage.getItem('tripo_claimed_places') || '[]'); } catch { return []; }
};

const getViews = (placeId: string): number => {
  let hash = 0;
  for (let i = 0; i < placeId.length; i++) hash = (hash * 31 + placeId.charCodeAt(i)) & 0xffffffff;
  return 40 + Math.abs(hash % 161); // 40-200
};

const getSaves = (placeId: string): number => {
  let hash = 0;
  for (let i = 0; i < placeId.length; i++) hash = (hash * 17 + placeId.charCodeAt(i)) & 0xffffffff;
  return 5 + Math.abs(hash % 46); // 5-50
};

const getReviewsForPlace = (placeId: string): any[] => {
  try {
    const key = `tripo_reviews_cache_${placeId}`;
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch { }
  return [];
};

const getOwnerReplies = (): Record<string, { text: string }> => {
  try { return JSON.parse(localStorage.getItem('tripo_owner_replies') || '{}'); } catch { return {}; }
};

const saveOwnerReply = (reviewId: string, text: string) => {
  const replies = getOwnerReplies();
  replies[reviewId] = { text };
  localStorage.setItem('tripo_owner_replies', JSON.stringify(replies));
};

const getPromos = (placeId: string): { text: string; active: boolean }[] => {
  try { return JSON.parse(localStorage.getItem(`tripo_promos_${placeId}`) || '[]'); } catch { return []; }
};

const savePromos = (placeId: string, promos: { text: string; active: boolean }[]) => {
  localStorage.setItem(`tripo_promos_${placeId}`, JSON.stringify(promos));
};

// ─── sub-components ────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1.5 shadow-sm">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4" />
    </div>
    <p className="text-2xl font-extrabold text-slate-900">{value}</p>
    <p className="text-xs text-slate-500 font-medium">{label}</p>
  </div>
);

// Hours editor for a single place
const HoursEditor = ({ placeId, onClose }: { placeId: string; onClose: () => void }) => {
  const [hours, setHours] = useState<Record<string, HoursEntry>>(() => {
    try {
      const stored = localStorage.getItem(`tripo_host_hours_${placeId}`);
      if (stored) return JSON.parse(stored);
    } catch { }

    // Default hours initialization
    return DAY_KEYS.reduce((acc, day) => ({
      ...acc,
      [day]: { open: '09:00', close: '22:00', closed: false }
    }), {} as Record<string, HoursEntry>);
  });

  const updateDay = (day: string, field: keyof HoursEntry, value: string | boolean) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = () => {
    localStorage.setItem(`tripo_host_hours_${placeId}`, JSON.stringify(hours));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">Update Hours</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="space-y-3">
          {DAY_KEYS.map((day, i) => {
            const h = hours[day] || { open: '09:00', close: '22:00', closed: false };
            return (
              <div key={day} className="bg-slate-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800">{DAY_LABELS[i]}</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.closed}
                      onChange={e => updateDay(day, 'closed', e.target.checked)}
                      className="accent-emerald-500"
                    />
                    Closed
                  </label>
                </div>
                {!h.closed && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={h.open}
                      onChange={e => updateDay(day, 'open', e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-slate-400 text-xs">to</span>
                    <input
                      type="time"
                      value={h.close}
                      onChange={e => updateDay(day, 'close', e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          onClick={handleSave}
          className="mt-5 w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
        >
          Save Hours
        </button>
      </div>
    </div>
  );
};

// Card for a single claimed place
const ClaimedPlaceCard = ({ claim }: { claim: ClaimedPlace }) => {
  const [showHoursEditor, setShowHoursEditor] = useState(false);
  const [reviews] = useState(() => getReviewsForPlace(claim.placeId));
  const [ownerReplies, setOwnerReplies] = useState<Record<string, { text: string }>>(getOwnerReplies);

  // Consolidate reply state
  const [replyState, setReplyState] = useState<{ id: string | null; text: string }>({ id: null, text: '' });

  // Consolidate promo state
  const [promoState, setPromoState] = useState({ text: '', showInput: false });
  const [promos, setPromos] = useState(() => getPromos(claim.placeId));
  const [reviewsExpanded, setReviewsExpanded] = useState(false);

  // Memoize stable stat values
  const views = useMemo(() => getViews(claim.placeId), [claim.placeId]);
  const saves = useMemo(() => getSaves(claim.placeId), [claim.placeId]);

  const isVerified = false; // Always false in current mockup

  const handleAddReply = (reviewId: string) => {
    if (!replyState.text.trim()) return;
    saveOwnerReply(reviewId, replyState.text.trim());
    setOwnerReplies(getOwnerReplies());
    setReplyState({ id: null, text: '' });
  };

  const handleAddPromo = () => {
    if (!promoState.text.trim()) return;
    const updated = [{ text: promoState.text.trim(), active: true }, ...promos];
    savePromos(claim.placeId, updated);
    setPromos(updated);
    setPromoState({ text: '', showInput: false });
  };

  const deactivatePromo = (idx: number) => {
    const updated = promos.map((p, i) => i === idx ? { ...p, active: false } : p);
    savePromos(claim.placeId, updated);
    setPromos(updated);
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-slate-900 truncate">{claim.businessName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{claim.role} · {claim.email}</p>
            </div>
            <span className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {isVerified
                ? <><CheckCircle className="w-3.5 h-3.5" /> Verified</>
                : <><Clock className="w-3.5 h-3.5" /> Pending Verification</>
              }
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="p-5 grid grid-cols-3 gap-3">
          <StatCard icon={Eye} label="Views this week" value={views} color="bg-blue-50 text-blue-600" />
          <StatCard icon={Bookmark} label="Saves" value={saves} color="bg-purple-50 text-purple-600" />
          <StatCard icon={MessageSquare} label="Reviews" value={reviews.length} color="bg-orange-50 text-orange-600" />
        </div>

        {/* Actions */}
        <div className="px-5 pb-4 space-y-3">
          {/* Update Hours */}
          <button
            onClick={() => setShowHoursEditor(true)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Update Hours</span>
            </div>
            <span className="text-xs text-emerald-600 font-medium">Edit →</span>
          </button>

          {/* Add Promotion */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => setPromoState(v => ({ ...v, showInput: !v.showInput }))}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Add Promotion</span>
              </div>
              {promoState.showInput ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {promoState.showInput && (
              <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                {/* Active promos */}
                {promos.filter(p => p.active).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    <span className="text-xs font-medium text-emerald-800 flex-1">🎉 {p.text}</span>
                    <button onClick={() => deactivatePromo(i)} className="text-emerald-500 hover:text-red-500 transition">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder='e.g. "10% off with Tripo this weekend!"'
                    value={promoState.text}
                    onChange={e => setPromoState(prev => ({ ...prev, text: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddPromo()}
                  />
                  <button
                    onClick={handleAddPromo}
                    disabled={!promoState.text.trim()}
                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Respond to Reviews */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
            <button
              onClick={() => setReviewsExpanded(v => !v)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-100 transition"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Respond to Reviews</span>
                {reviews.length > 0 && (
                  <span className="text-[10px] bg-orange-100 text-orange-600 font-semibold px-1.5 py-0.5 rounded-full">{reviews.length}</span>
                )}
              </div>
              {reviewsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {reviewsExpanded && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                {reviews.length === 0 ? (
                  <div className="text-center py-4 text-slate-400">
                    <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-40" />
                    <p className="text-xs">No reviews yet for this place.</p>
                    <p className="text-[11px] text-slate-300 mt-1">Reviews appear here once customers visit via the map.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.slice(0, 3).map((r: any, i) => {
                      const reviewId = r._id || String(i);
                      const existingReply = ownerReplies[reviewId];
                      return (
                        <div key={reviewId} className="bg-white rounded-xl border border-slate-100 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <img
                              src={typeof r.userId === 'object' ? r.userId?.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${reviewId}`}
                              className="w-5 h-5 rounded-full bg-slate-100"
                              alt=""
                            />
                            <p className="text-xs font-semibold text-slate-800">{typeof r.userId === 'object' ? r.userId?.name : 'Customer'}</p>
                            <div className="flex gap-0.5 ml-auto">
                              {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= (r.rating || 5) ? 'fill-orange-400 text-orange-400' : 'text-slate-200'}`} />)}
                            </div>
                          </div>
                          {r.comment && <p className="text-xs text-slate-600 mb-2">{r.comment}</p>}
                          {existingReply ? (
                            <div className="ml-2 pl-2 border-l-2 border-emerald-300 bg-emerald-50 rounded-r-lg p-2">
                              <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">Your Response</p>
                              <p className="text-xs text-slate-700">{existingReply.text}</p>
                            </div>
                          ) : (
                            replyState.id === reviewId ? (
                              <div className="flex gap-1.5 mt-1">
                                <input
                                  className="flex-1 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder="Write your response..."
                                  value={replyState.text}
                                  onChange={e => setReplyState(prev => ({ ...prev, text: e.target.value }))}
                                  onKeyDown={e => e.key === 'Enter' && handleAddReply(reviewId)}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleAddReply(reviewId)}
                                  disabled={!replyState.text.trim()}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-40"
                                >
                                  <Send className="w-3 h-3" />
                                </button>
                                <button onClick={() => setReplyState({ id: null, text: '' })} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setReplyState({ id: reviewId, text: '' })}
                                className="text-[11px] text-emerald-600 font-medium hover:text-emerald-700 transition"
                              >
                                Reply as Owner
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showHoursEditor && (
        <HoursEditor placeId={claim.placeId} onClose={() => setShowHoursEditor(false)} />
      )}
    </>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

export const HostDashboardScreen = () => {
  const [claimedPlaces, setClaimedPlaces] = useState<ClaimedPlace[]>([]);

  useEffect(() => {
    setClaimedPlaces(getClaimedPlaces());

    // Listen for storage changes in case user claims a place while on this screen
    const handler = () => setClaimedPlaces(getClaimedPlaces());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-slate-900 leading-tight">Host Dashboard</h1>
            <p className="text-xs text-slate-500">Manage your claimed listings</p>
          </div>
          {claimedPlaces.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">{claimedPlaces.length} listing{claimedPlaces.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {claimedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Store className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No listings yet</h3>
            <p className="text-slate-400 max-w-xs text-sm leading-relaxed">
              You haven't claimed any listings yet. Find your business on the map and tap "Claim this listing".
            </p>
          </div>
        ) : (
          <div className="space-y-6">
              {claimedPlaces.map(claim => (
                <React.Fragment key={claim.placeId}>
                  <ClaimedPlaceCard claim={claim} />
                </React.Fragment>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};