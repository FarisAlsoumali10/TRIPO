import React, { useState, useEffect, useMemo } from 'react';
import {
  Store, Clock, MessageSquare, Send, X,
  ChevronDown, ChevronUp, Tag, Star, MapPin, Pencil, Trash2,
  ToggleLeft, ToggleRight, Tent, AlertTriangle, Compass,
  Wallet, TrendingUp, ArrowDownToLine, CheckCircle2,
} from 'lucide-react';
import { rentalAPI, tourAPI, walletAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { RentalFormFields, RentalFormValue } from '../components/RentalFormFields';

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG      = '#050B1E';
const SURFACE = '#081229';
const LIFTED  = '#101B36';
const MINT    = '#7CF7C8';
const MOON    = '#B8C2D6';
const SAND    = '#7F8AA3';
const GOLD    = '#F7C948';
const RED     = '#FF6B7A';
const BORDER  = 'rgba(255,255,255,0.08)';
const MINT_GLOW = '0 8px 24px -6px rgba(124,247,200,0.45)';

// ── Legacy claimed-places types/helpers ───────────────────────────────────────
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

const DAY_KEYS   = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getClaimedPlaces  = (): ClaimedPlace[] => { try { return JSON.parse(localStorage.getItem('tripo_claimed_places') || '[]'); } catch { return []; } };
const getOwnerReplies   = (): Record<string, { text: string }> => { try { return JSON.parse(localStorage.getItem('tripo_owner_replies') || '{}'); } catch { return {}; } };
const saveOwnerReply    = (id: string, text: string) => { const r = getOwnerReplies(); r[id] = { text }; localStorage.setItem('tripo_owner_replies', JSON.stringify(r)); };
const getPromos         = (pid: string): { text: string; active: boolean }[] => { try { return JSON.parse(localStorage.getItem(`tripo_promos_${pid}`) || '[]'); } catch { return []; } };
const savePromos        = (pid: string, promos: { text: string; active: boolean }[]) => localStorage.setItem(`tripo_promos_${pid}`, JSON.stringify(promos));

const getViews = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff; return 40 + Math.abs(h % 161); };
const getSaves = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) & 0xffffffff; return 5 + Math.abs(h % 46); };
const getReviews = (pid: string): any[] => { try { const c = localStorage.getItem(`tripo_reviews_cache_${pid}`); return c ? JSON.parse(c) : []; } catch { return []; } };

// ── Hours editor (claimed-places) ─────────────────────────────────────────────
const HoursEditor = ({ placeId, onClose }: { placeId: string; onClose: () => void }) => {
  const [hours, setHours] = useState<Record<string, HoursEntry>>(() => {
    try { const s = localStorage.getItem(`tripo_host_hours_${placeId}`); if (s) return JSON.parse(s); } catch {}
    return DAY_KEYS.reduce((acc, d) => ({ ...acc, [d]: { open: '09:00', close: '22:00', closed: false } }), {} as Record<string, HoursEntry>);
  });

  const update = (day: string, field: keyof HoursEntry, val: string | boolean) =>
    setHours(p => ({ ...p, [day]: { ...p[day], [field]: val } }));

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(5,11,30,0.85)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-white text-base">Update Hours</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: LIFTED }}>
            <X className="w-4 h-4" style={{ color: MOON }} />
          </button>
        </div>
        <div className="space-y-2.5">
          {DAY_KEYS.map((day, i) => {
            const h = hours[day] || { open: '09:00', close: '22:00', closed: false };
            return (
              <div key={day} className="rounded-2xl p-3" style={{ background: LIFTED }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{DAY_LABELS[i]}</span>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: SAND }}>
                    <input type="checkbox" checked={h.closed} onChange={e => update(day, 'closed', e.target.checked)} className="accent-emerald-500" />
                    Closed
                  </label>
                </div>
                {!h.closed && (
                  <div className="flex items-center gap-2">
                    <input type="time" value={h.open} onChange={e => update(day, 'open', e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
                      style={{ background: SURFACE, border: `1px solid ${BORDER}` }} />
                    <span className="text-xs" style={{ color: SAND }}>to</span>
                    <input type="time" value={h.close} onChange={e => update(day, 'close', e.target.value)}
                      className="flex-1 rounded-lg px-2 py-1.5 text-sm text-white outline-none"
                      style={{ background: SURFACE, border: `1px solid ${BORDER}` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => { localStorage.setItem(`tripo_host_hours_${placeId}`, JSON.stringify(hours)); onClose(); }}
          className="mt-5 w-full py-3 rounded-full font-black text-sm transition-all active:scale-[0.97]"
          style={{ background: MINT, color: BG, boxShadow: MINT_GLOW }}>
          Save Hours
        </button>
      </div>
    </div>
  );
};

// ── Claimed place card ────────────────────────────────────────────────────────
const ClaimedPlaceCard = ({ claim }: { claim: ClaimedPlace }) => {
  const [showHours, setShowHours] = useState(false);
  const [reviews]     = useState(() => getReviews(claim.placeId));
  const [replies, setReplies] = useState(getOwnerReplies);
  const [replyState, setReplyState] = useState<{ id: string | null; text: string }>({ id: null, text: '' });
  const [promoState, setPromoState] = useState({ text: '', open: false });
  const [promos, setPromos] = useState(() => getPromos(claim.placeId));
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const views = useMemo(() => getViews(claim.placeId), [claim.placeId]);
  const saves = useMemo(() => getSaves(claim.placeId), [claim.placeId]);

  const addReply = (reviewId: string) => {
    if (!replyState.text.trim()) return;
    saveOwnerReply(reviewId, replyState.text.trim());
    setReplies(getOwnerReplies());
    setReplyState({ id: null, text: '' });
  };

  const addPromo = () => {
    if (!promoState.text.trim()) return;
    const updated = [{ text: promoState.text.trim(), active: true }, ...promos];
    savePromos(claim.placeId, updated);
    setPromos(updated);
    setPromoState(p => ({ ...p, text: '' }));
  };

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: BORDER }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-white text-base truncate">{claim.businessName}</h3>
              <p className="text-xs mt-0.5" style={{ color: SAND }}>{claim.role} · {claim.email}</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(247,201,72,0.12)', color: GOLD }}>
              <Clock className="w-3 h-3" /> Pending
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="p-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Views', value: views },
            { label: 'Saves', value: saves },
            { label: 'Reviews', value: reviews.length },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: LIFTED }}>
              <p className="font-black text-white text-xl">{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: SAND }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-2.5">
          <button onClick={() => setShowHours(true)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl transition-all active:scale-[0.98]"
            style={{ background: LIFTED }}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: SAND }} />
              <span className="text-sm font-bold text-white">Update Hours</span>
            </div>
            <span className="text-xs font-bold" style={{ color: MINT }}>Edit →</span>
          </button>

          {/* Promotions */}
          <div className="rounded-2xl overflow-hidden" style={{ background: LIFTED }}>
            <button onClick={() => setPromoState(p => ({ ...p, open: !p.open }))}
              className="w-full flex items-center justify-between p-3.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" style={{ color: SAND }} />
                <span className="text-sm font-bold text-white">Add Promotion</span>
              </div>
              {promoState.open ? <ChevronUp className="w-4 h-4" style={{ color: SAND }} /> : <ChevronDown className="w-4 h-4" style={{ color: SAND }} />}
            </button>
            {promoState.open && (
              <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: BORDER }}>
                {promos.filter(p => p.active).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl" style={{ background: SURFACE }}>
                    <span className="text-xs font-bold flex-1 text-white">🎉 {p.text}</span>
                    <button onClick={() => { const u = promos.map((pr, j) => j === i ? { ...pr, active: false } : pr); savePromos(claim.placeId, u); setPromos(u); }}>
                      <X className="w-3.5 h-3.5" style={{ color: RED }} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-1">
                  <input className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    placeholder={'"10% off with Tripo this weekend!"'}
                    value={promoState.text}
                    onChange={e => setPromoState(p => ({ ...p, text: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addPromo()} />
                  <button onClick={addPromo} disabled={!promoState.text.trim()}
                    className="w-9 h-9 flex items-center justify-center rounded-xl disabled:opacity-40"
                    style={{ background: MINT }}>
                    <Send className="w-4 h-4" style={{ color: BG }} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="rounded-2xl overflow-hidden" style={{ background: LIFTED }}>
            <button onClick={() => setReviewsOpen(v => !v)}
              className="w-full flex items-center justify-between p-3.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: SAND }} />
                <span className="text-sm font-bold text-white">Respond to Reviews</span>
                {reviews.length > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,107,122,0.15)', color: RED }}>{reviews.length}</span>
                )}
              </div>
              {reviewsOpen ? <ChevronUp className="w-4 h-4" style={{ color: SAND }} /> : <ChevronDown className="w-4 h-4" style={{ color: SAND }} />}
            </button>
            {reviewsOpen && (
              <div className="px-4 pb-4 pt-1 border-t space-y-3" style={{ borderColor: BORDER }}>
                {reviews.length === 0 ? (
                  <p className="text-xs py-3 text-center" style={{ color: SAND }}>No reviews yet.</p>
                ) : reviews.slice(0, 3).map((r: any, i: number) => {
                  const rid = r._id || String(i);
                  const reply = replies[rid];
                  return (
                    <div key={rid} className="rounded-xl p-3" style={{ background: SURFACE }}>
                      <div className="flex items-center gap-2 mb-1">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${rid}`}
                          className="w-5 h-5 rounded-full" alt="" />
                        <p className="text-xs font-bold text-white">{typeof r.userId === 'object' ? r.userId?.name : 'Guest'}</p>
                        <div className="flex gap-0.5 ml-auto">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= (r.rating||5) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />)}
                        </div>
                      </div>
                      {r.comment && <p className="text-xs mb-2" style={{ color: MOON }}>{r.comment}</p>}
                      {reply ? (
                        <div className="pl-2 border-l-2 p-2 rounded-r-xl text-xs" style={{ borderColor: MINT, background: 'rgba(124,247,200,0.06)' }}>
                          <p className="font-black mb-0.5" style={{ color: MINT }}>Your reply</p>
                          <p style={{ color: MOON }}>{reply.text}</p>
                        </div>
                      ) : replyState.id === rid ? (
                        <div className="flex gap-1.5 mt-1">
                          <input className="flex-1 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            style={{ background: LIFTED, border: `1px solid ${BORDER}` }}
                            placeholder="Write your reply..." autoFocus
                            value={replyState.text}
                            onChange={e => setReplyState(p => ({ ...p, text: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addReply(rid)} />
                          <button onClick={() => addReply(rid)} disabled={!replyState.text.trim()}
                            className="w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-40"
                            style={{ background: MINT }}>
                            <Send className="w-3 h-3" style={{ color: BG }} />
                          </button>
                          <button onClick={() => setReplyState({ id: null, text: '' })}>
                            <X className="w-3 h-3" style={{ color: SAND }} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setReplyState({ id: rid, text: '' })}
                          className="text-xs font-bold mt-1" style={{ color: MINT }}>
                          Reply as Owner
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {showHours && <HoursEditor placeId={claim.placeId} onClose={() => setShowHours(false)} />}
    </>
  );
};

// ── Rental management card ────────────────────────────────────────────────────
const RentalCard = ({
  rental,
  onUpdate,
  onDelete,
}: {
  rental: any;
  onUpdate: (id: string, patch: any) => void;
  onDelete: (id: string) => void;
}) => {
  const id = rental.id || rental._id || '';
  const [showEdit, setShowEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<RentalFormValue>({
    title:        rental.title || '',
    locationName: rental.locationName || '',
    type:         rental.type || 'Chalet',
    price:        String(rental.price || ''),
    description:  rental.description || '',
    phone:        rental.phone || rental.contactPhone || '',
    amenities:    rental.amenities || [],
  });

  const views  = useMemo(() => getViews(id), [id]);
  const saves  = useMemo(() => getSaves(id), [id]);
  const rating = rental.ratingSummary?.avgRating || rental.rating || 0;
  const active = rental.active !== false;

  const handleToggle = async () => {
    setToggling(true);
    try {
      await rentalAPI.updateRental(id, { active: !active });
      onUpdate(id, { active: !active });
      showToast(active ? 'Listing paused' : 'Listing activated', 'success');
    } catch {
      showToast('Failed to update listing', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await rentalAPI.updateRental(id, {
        title:        editForm.title.trim(),
        locationName: editForm.locationName.trim(),
        type:         editForm.type,
        price:        Number(editForm.price),
        description:  editForm.description.trim(),
        phone:        editForm.phone.trim(),
        amenities:    editForm.amenities,
      });
      onUpdate(id, {
        title:        editForm.title.trim(),
        locationName: editForm.locationName.trim(),
        type:         editForm.type,
        price:        Number(editForm.price),
        description:  editForm.description.trim(),
        phone:        editForm.phone.trim(),
        amenities:    editForm.amenities,
      });
      showToast('Changes saved', 'success');
      setShowEdit(false);
    } catch {
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await rentalAPI.deleteRental(id);
      onDelete(id);
      showToast('Listing deleted', 'success');
    } catch {
      showToast('Failed to delete listing', 'error');
    }
  };

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}`, opacity: active ? 1 : 0.6 }}>
        {/* Header */}
        <div className="p-4 flex items-start gap-3">
          {rental.image ? (
            <img src={rental.image} alt={rental.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0" style={{ background: LIFTED }}>
              <Tent className="w-7 h-7" style={{ color: SAND }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-black text-white text-sm leading-tight">{rental.title}</p>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                style={{ background: 'rgba(124,247,200,0.12)', color: MINT }}>
                {rental.type || 'Rental'}
              </span>
            </div>
            {rental.locationName && (
              <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: SAND }}>
                <MapPin className="w-3 h-3 shrink-0" />{rental.locationName}
              </p>
            )}
            <p className="font-black text-white text-sm mt-1">
              SAR {rental.price} <span className="font-normal text-xs" style={{ color: SAND }}>/ night</span>
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 px-4 pb-4">
          {[
            { label: 'Est. Views', value: views },
            { label: 'Est. Saves', value: saves },
            { label: 'Rating', value: rating > 0 ? rating.toFixed(1) : '—', gold: true },
            { label: active ? 'Active' : 'Paused', value: null, toggle: true },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-2.5 flex flex-col items-center gap-1" style={{ background: LIFTED }}>
              {s.toggle ? (
                <button onClick={handleToggle} disabled={toggling} className="transition-all active:scale-90">
                  {active
                    ? <ToggleRight className="w-6 h-6" style={{ color: MINT }} />
                    : <ToggleLeft className="w-6 h-6" style={{ color: SAND }} />}
                </button>
              ) : (
                <p className="font-black text-sm" style={{ color: s.gold ? GOLD : 'white' }}>{s.value}</p>
              )}
              <p className="text-[9px] font-bold text-center leading-tight" style={{ color: SAND }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-black transition-all active:scale-95"
            style={{ background: LIFTED, color: MOON }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: 'rgba(255,107,122,0.12)' }}
          >
            <Trash2 className="w-4 h-4" style={{ color: RED }} />
          </button>
        </div>
      </div>

      {/* Edit sheet */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(5,11,30,0.80)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-md rounded-t-3xl flex flex-col" style={{ background: SURFACE, border: `1px solid ${BORDER}`, maxHeight: '90dvh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="font-black text-white text-base">Edit listing</h3>
              <button onClick={() => setShowEdit(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: LIFTED }}>
                <X className="w-4 h-4" style={{ color: MOON }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <RentalFormFields value={editForm} onChange={setEditForm} />
            </div>
            <div className="px-5 pt-3 pb-6">
              <button
                onClick={handleSave}
                disabled={saving || !editForm.title.trim() || !editForm.locationName.trim() || !editForm.price}
                className="w-full py-3.5 rounded-full font-black text-sm transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: MINT, color: BG, boxShadow: MINT_GLOW }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm sheet */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(5,11,30,0.80)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowConfirmDelete(false)}>
          <div className="w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: RED }} />
              <p className="font-black text-white text-base">Delete listing?</p>
            </div>
            <p className="text-sm mb-6" style={{ color: SAND }}>
              "{rental.title}" will be permanently removed. This can't be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-3 rounded-full font-black text-sm"
                style={{ background: LIFTED, color: MOON }}>
                Cancel
              </button>
              <button onClick={() => { setShowConfirmDelete(false); handleDelete(); }}
                className="flex-1 py-3 rounded-full font-black text-sm"
                style={{ background: 'rgba(255,107,122,0.15)', color: RED }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
export const HostDashboardScreen = () => {
  const [tab, setTab] = useState<'rentals' | 'tours' | 'bookings' | 'claimed' | 'earnings'>('rentals');
  const [rentals, setRentals] = useState<any[]>([]);
  const [myTours, setMyTours] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [tourBookings, setTourBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toursLoading, setToursLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [claimedPlaces] = useState<ClaimedPlace[]>(() => getClaimedPlaces());
  const [editingTour, setEditingTour] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingTour, setSavingTour] = useState(false);

  // Earnings tab state
  const [earnings, setEarnings] = useState<{ walletBalance: number; pendingPayoutTotal: number; payoutHistory: any[] } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutBank, setPayoutBank] = useState('');
  const [payoutIban, setPayoutIban] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);

  useEffect(() => {
    rentalAPI.getMyRentals()
      .then(r => setRentals(r))
      .catch(() => showToast('Could not load your listings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== 'tours') return;
    setToursLoading(true);
    tourAPI.getMyTours()
      .then(t => setMyTours(t))
      .catch(() => showToast('Could not load your tours', 'error'))
      .finally(() => setToursLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'bookings') return;
    setBookingsLoading(true);
    Promise.allSettled([
      rentalAPI.getMyRentalBookings(),
      tourAPI.getMyTourBookings(),
    ]).then(([rentalRes, tourRes]) => {
      setBookings(rentalRes.status === 'fulfilled' ? rentalRes.value : []);
      setTourBookings(tourRes.status === 'fulfilled' ? tourRes.value : []);
    }).finally(() => setBookingsLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'earnings') return;
    setEarningsLoading(true);
    walletAPI.getEarnings()
      .then(data => setEarnings(data))
      .catch(() => showToast('Could not load earnings', 'error'))
      .finally(() => setEarningsLoading(false));
  }, [tab]);

  const handleRequestPayout = async () => {
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    if (!payoutBank.trim() || !payoutIban.trim()) { showToast('Bank name and IBAN are required', 'error'); return; }
    setPayoutSubmitting(true);
    try {
      const res = await walletAPI.requestPayout({ amount, bankName: payoutBank.trim(), iban: payoutIban.trim() });
      showToast('Payout request submitted!', 'success');
      setEarnings(prev => prev ? {
        ...prev,
        walletBalance: res.remainingBalance,
        payoutHistory: [res.payoutRequest, ...prev.payoutHistory],
        pendingPayoutTotal: prev.pendingPayoutTotal + amount,
      } : prev);
      setPayoutAmount(''); setPayoutBank(''); setPayoutIban(''); setPayoutFormOpen(false);
    } catch (e: any) {
      showToast(e?.response?.data?.error || 'Failed to submit request', 'error');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const allBookings = useMemo(() => {
    const rb = bookings.map((b: any) => ({ ...b, _kind: 'rental' }));
    const tb = tourBookings.map((b: any) => ({ ...b, _kind: 'tour' }));
    return [...rb, ...tb].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [bookings, tourBookings]);

  const pendingCount = allBookings.filter((b: any) => b.status === 'pending').length;

  const handleUpdate = (id: string, patch: any) =>
    setRentals(rs => rs.map(r => (r.id === id || r._id === id) ? { ...r, ...patch } : r));

  const handleDelete = (id: string) =>
    setRentals(rs => rs.filter(r => r.id !== id && r._id !== id));

  const handleSaveTour = async () => {
    if (!editingTour) return;
    setSavingTour(true);
    try {
      const updated = await tourAPI.updateTour(editingTour.id || editingTour._id, {
        pricePerPerson: Number(editPrice),
        description: editDesc,
      });
      setMyTours(ts => ts.map(t => (t.id === editingTour.id || t._id === editingTour._id) ? { ...t, ...updated } : t));
      setEditingTour(null);
      showToast('Tour updated', 'success');
    } catch {
      showToast('Failed to update tour', 'error');
    } finally {
      setSavingTour(false);
    }
  };

  const handleDeactivateTour = async (tour: any) => {
    const id = tour.id || tour._id;
    const newStatus = tour.status === 'active' ? 'inactive' : 'active';
    try {
      await tourAPI.updateTour(id, { status: newStatus });
      setMyTours(ts => ts.map(t => (t.id === id || t._id === id) ? { ...t, status: newStatus } : t));
      showToast(newStatus === 'active' ? 'Tour is now active' : 'Tour deactivated', 'success');
    } catch {
      showToast('Failed to update tour status', 'error');
    }
  };

  const handleDeleteTour = async (tour: any) => {
    const id = tour.id || tour._id;
    try {
      await tourAPI.deleteTour(id);
      setMyTours(ts => ts.filter(t => t.id !== id && t._id !== id));
      showToast('Tour removed', 'success');
    } catch {
      showToast('Failed to remove tour', 'error');
    }
  };

  return (
    <div className="min-h-full pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(124,247,200,0.10)' }}>
            <Store className="w-5 h-5" style={{ color: MINT }} />
          </div>
          <div>
            <h1 className="font-black text-white" style={{ fontSize: '1.25rem', letterSpacing: '-0.015em' }}>
              Host Dashboard
            </h1>
            <p className="text-xs" style={{ color: SAND }}>
              {rentals.length} rental{rentals.length !== 1 ? 's' : ''} · {myTours.length} tour{myTours.length !== 1 ? 's' : ''} · {claimedPlaces.length} claimed
              {pendingCount > 0 && ` · ${pendingCount} pending`}
            </p>
          </div>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex px-5 gap-2 mb-5 overflow-x-auto no-scrollbar">
        {(['rentals', 'tours', 'bookings', 'claimed', 'earnings'] as const).map(tabId => {
          const count = tabId === 'bookings' ? pendingCount : 0;
          const label = tabId === 'rentals' ? 'My Rentals'
            : tabId === 'tours' ? 'My Tours'
            : tabId === 'bookings' ? 'Bookings'
            : tabId === 'earnings' ? 'Earnings'
            : 'Claimed Places';
          return (
            <button key={tabId} onClick={() => setTab(tabId)}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all"
              style={tab === tabId
                ? { background: MINT, color: BG }
                : { background: LIFTED, color: SAND, border: `1px solid ${BORDER}` }}>
              {label}
              {count > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: tab === 'bookings' ? BG : RED, color: tab === 'bookings' ? BG : 'white' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Edit tour sheet */}
      {editingTour && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end" onClick={() => setEditingTour(null)}>
          <div className="w-full rounded-t-3xl p-5 space-y-3" style={{ background: SURFACE }} onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-white text-base">Edit Tour</h3>
            <div>
              <label className="text-xs font-semibold" style={{ color: SAND }}>Price per Person (SAR)</label>
              <input
                type="number" min="0" value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                style={{ background: LIFTED, border: `1px solid ${BORDER}` }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: SAND }}>Description</label>
              <textarea
                rows={3} value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none resize-none"
                style={{ background: LIFTED, border: `1px solid ${BORDER}` }}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditingTour(null)} className="flex-1 py-2.5 rounded-full text-xs font-black" style={{ background: LIFTED, color: SAND }}>Cancel</button>
              <button onClick={handleSaveTour} disabled={savingTour} className="flex-1 py-2.5 rounded-full text-xs font-black" style={{ background: MINT, color: BG }}>
                {savingTour ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Tours tab */}
      {tab === 'tours' && (
        <div className="px-5 space-y-4">
          {toursLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: SURFACE }} />)}
            </div>
          ) : myTours.length === 0 ? (
            <div className="rounded-2xl px-5 py-10 flex flex-col items-center text-center"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <Compass className="w-10 h-10 mb-3" style={{ color: SAND }} />
              <p className="font-black text-white text-sm mb-1">No tours yet</p>
              <p className="text-xs mb-5" style={{ color: SAND }}>
                Publish your first tour using the "Add a New Tour" tab.
              </p>
            </div>
          ) : (
            myTours.map(tour => {
              const tourId = tour.id || tour._id;
              const isActive = tour.status === 'active';
              return (
                <div key={tourId} className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex gap-3 p-3">
                    {tour.heroImage && (
                      <img src={tour.heroImage} alt={tour.title} className="w-20 h-16 rounded-xl object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-black text-white text-sm truncate">{tour.title}</p>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: isActive ? 'rgba(124,247,200,0.12)' : 'rgba(255,107,122,0.12)',
                            color: isActive ? MINT : RED,
                          }}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs font-bold mt-0.5" style={{ color: MINT }}>SAR {tour.pricePerPerson}/person</p>
                      <p className="text-xs mt-0.5" style={{ color: SAND }}>{tour.bookingsCount || 0} booking{tour.bookingsCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex border-t" style={{ borderColor: BORDER }}>
                    <button
                      onClick={() => { setEditingTour(tour); setEditPrice(String(tour.pricePerPerson ?? '')); setEditDesc(tour.description ?? ''); }}
                      className="flex-1 py-2.5 text-xs font-black text-center transition-opacity hover:opacity-70"
                      style={{ color: MINT }}>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivateTour(tour)}
                      className="flex-1 py-2.5 text-xs font-black text-center transition-opacity hover:opacity-70 border-x"
                      style={{ color: SAND, borderColor: BORDER }}>
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDeleteTour(tour)}
                      className="flex-1 py-2.5 text-xs font-black text-center transition-opacity hover:opacity-70"
                      style={{ color: RED }}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* My Rentals tab */}
      {tab === 'rentals' && (
        <div className="px-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: SURFACE }} />
              ))}
            </div>
          ) : rentals.length === 0 ? (
            <div className="rounded-2xl px-5 py-10 flex flex-col items-center text-center"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <Tent className="w-10 h-10 mb-3" style={{ color: SAND }} />
              <p className="font-black text-white text-sm mb-1">No listings yet</p>
              <p className="text-xs mb-5" style={{ color: SAND }}>
                List your first chalet, camp, or villa to start getting bookings.
              </p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'rentals' }))}
                className="px-5 py-2.5 rounded-full font-black text-xs transition-all active:scale-95"
                style={{ background: MINT, color: BG, boxShadow: MINT_GLOW }}>
                List a place
              </button>
            </div>
          ) : (
            rentals.map(rental => (
              <React.Fragment key={rental.id || rental._id}>
                <RentalCard
                  rental={rental}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {/* Bookings tab */}
      {tab === 'bookings' && (
        <div className="px-5 space-y-3">
          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: SURFACE }} />
              ))}
            </div>
          ) : allBookings.length === 0 ? (
            <div className="rounded-2xl px-5 py-10 flex flex-col items-center text-center"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <MessageSquare className="w-10 h-10 mb-3" style={{ color: SAND }} />
              <p className="font-black text-white text-sm mb-1">No bookings yet</p>
              <p className="text-xs" style={{ color: SAND }}>
                Bookings from guests will appear here as soon as someone reserves your place or tour.
              </p>
            </div>
          ) : (
            allBookings.map((booking: any) => {
              const guest = booking.userId;
              const guestName = typeof guest === 'object' ? guest?.name : 'Guest';
              const guestAvatar = typeof guest === 'object' ? guest?.avatar : null;
              const details = booking.bookingDetails || {};
              const isPending = booking.status === 'pending';
              const isConfirmed = booking.status === 'confirmed';
              const isTour = booking._kind === 'tour';
              const label = isTour
                ? (details.tourTitle || 'Your tour')
                : (booking.rentalTitle || details.rentalTitle || 'Your rental');
              return (
                <div key={booking.id || booking._id}
                  className="rounded-2xl p-4"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start gap-3">
                    <img
                      src={guestAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.id}`}
                      alt={guestName}
                      className="w-10 h-10 rounded-full shrink-0"
                      style={{ background: LIFTED }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-white text-sm truncate">{guestName}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                            style={{
                              background: isTour ? 'rgba(99,102,241,0.15)' : 'rgba(124,247,200,0.08)',
                              color: isTour ? '#818cf8' : SAND,
                            }}>
                            {isTour ? 'Tour' : 'Rental'}
                          </span>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                            style={{
                              background: isPending ? 'rgba(247,201,72,0.12)' : isConfirmed ? 'rgba(124,247,200,0.12)' : 'rgba(255,107,122,0.12)',
                              color: isPending ? GOLD : isConfirmed ? MINT : RED,
                            }}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: SAND }}>{label}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {details.date && (
                          <span className="text-xs" style={{ color: MOON }}>{details.date}</span>
                        )}
                        {!isTour && details.nightsOrHours && (
                          <span className="text-xs" style={{ color: SAND }}>
                            {details.nightsOrHours} night{details.nightsOrHours !== 1 ? 's' : ''}
                          </span>
                        )}
                        {isTour && details.guests && (
                          <span className="text-xs" style={{ color: SAND }}>
                            {details.guests} guest{details.guests !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="font-black text-xs ml-auto" style={{ color: MINT }}>
                          SAR {booking.totalPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Earnings tab */}
      {tab === 'earnings' && (
        <div className="px-5 space-y-4">
          {earningsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: SURFACE }} />)}
            </div>
          ) : (
            <>
              {/* Balance cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" style={{ color: MINT }} />
                    <span className="text-xs font-bold" style={{ color: SAND }}>Available</span>
                  </div>
                  <p className="font-black text-white text-xl">
                    {earnings?.walletBalance?.toFixed(2) ?? '0.00'}
                    <span className="text-xs font-bold ml-1" style={{ color: SAND }}>SAR</span>
                  </p>
                </div>
                <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: GOLD }} />
                    <span className="text-xs font-bold" style={{ color: SAND }}>Pending</span>
                  </div>
                  <p className="font-black text-white text-xl">
                    {earnings?.pendingPayoutTotal?.toFixed(2) ?? '0.00'}
                    <span className="text-xs font-bold ml-1" style={{ color: SAND }}>SAR</span>
                  </p>
                </div>
              </div>

              {/* Request Payout */}
              <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <button
                  onClick={() => setPayoutFormOpen(v => !v)}
                  className="w-full flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4" style={{ color: MINT }} />
                    <span className="text-sm font-black text-white">Request Payout</span>
                  </div>
                  {payoutFormOpen
                    ? <ChevronUp className="w-4 h-4" style={{ color: SAND }} />
                    : <ChevronDown className="w-4 h-4" style={{ color: SAND }} />}
                </button>

                {payoutFormOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: BORDER }}>
                    <div className="pt-3">
                      <label className="text-xs font-bold" style={{ color: SAND }}>Amount (SAR)</label>
                      <input
                        type="number" min="1"
                        value={payoutAmount}
                        onChange={e => setPayoutAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                        style={{ background: LIFTED, border: `1px solid ${BORDER}` }}
                      />
                      {earnings && (
                        <p className="text-[10px] mt-1" style={{ color: SAND }}>
                          Available: SAR {earnings.walletBalance.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold" style={{ color: SAND }}>Bank Name</label>
                      <input
                        type="text"
                        value={payoutBank}
                        onChange={e => setPayoutBank(e.target.value)}
                        placeholder="e.g. Al Rajhi Bank"
                        className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                        style={{ background: LIFTED, border: `1px solid ${BORDER}` }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold" style={{ color: SAND }}>IBAN</label>
                      <input
                        type="text"
                        value={payoutIban}
                        onChange={e => setPayoutIban(e.target.value)}
                        placeholder="SA0000000000000000000000"
                        className="w-full mt-1 rounded-xl px-3 py-2.5 text-sm text-white outline-none font-mono"
                        style={{ background: LIFTED, border: `1px solid ${BORDER}` }}
                      />
                    </div>
                    <button
                      onClick={handleRequestPayout}
                      disabled={payoutSubmitting || !payoutAmount || !payoutBank || !payoutIban}
                      className="w-full py-3 rounded-full text-sm font-black transition-all active:scale-[0.97] disabled:opacity-40"
                      style={{ background: MINT, color: BG, boxShadow: MINT_GLOW }}
                    >
                      {payoutSubmitting ? 'Submitting…' : 'Submit Request'}
                    </button>
                  </div>
                )}
              </div>

              {/* Payout history */}
              {earnings && earnings.payoutHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black" style={{ color: SAND }}>Payout History</p>
                  {earnings.payoutHistory.map((p: any, i: number) => {
                    const isPending = p.status === 'pending';
                    const isProcessed = p.status === 'processed';
                    return (
                      <div key={p._id || i} className="flex items-center justify-between p-3.5 rounded-2xl"
                        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: isProcessed ? 'rgba(124,247,200,0.12)' : isPending ? 'rgba(247,201,72,0.12)' : 'rgba(255,107,122,0.12)' }}>
                            {isProcessed
                              ? <CheckCircle2 className="w-4 h-4" style={{ color: MINT }} />
                              : isPending
                              ? <Clock className="w-4 h-4" style={{ color: GOLD }} />
                              : <X className="w-4 h-4" style={{ color: RED }} />}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">SAR {p.amount?.toFixed(2)}</p>
                            <p className="text-[10px]" style={{ color: SAND }}>
                              {p.bankName || 'Bank transfer'} · {p.status}
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px]" style={{ color: SAND }}>
                          {p.requestedAt ? new Date(p.requestedAt).toLocaleDateString('en-SA', { day: 'numeric', month: 'short' }) : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {earnings && earnings.payoutHistory.length === 0 && (
                <div className="rounded-2xl px-5 py-8 flex flex-col items-center text-center"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <Wallet className="w-8 h-8 mb-2" style={{ color: SAND }} />
                  <p className="text-xs" style={{ color: SAND }}>No payout requests yet. Your earnings appear here after guests pay.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Claimed Places tab */}
      {tab === 'claimed' && (
        <div className="px-5 space-y-4">
          {claimedPlaces.length === 0 ? (
            <div className="rounded-2xl px-5 py-10 flex flex-col items-center text-center"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <Store className="w-10 h-10 mb-3" style={{ color: SAND }} />
              <p className="font-black text-white text-sm mb-1">No claimed places</p>
              <p className="text-xs" style={{ color: SAND }}>
                Find your business on the map and tap "Claim this listing".
              </p>
            </div>
          ) : (
            claimedPlaces.map(claim => (
              <React.Fragment key={claim.placeId}>
                <ClaimedPlaceCard claim={claim} />
              </React.Fragment>
            ))
          )}
        </div>
      )}
    </div>
  );
};
