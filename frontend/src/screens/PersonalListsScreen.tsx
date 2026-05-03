import React, { useState } from 'react';
import {
  Bookmark, Check, Star, AlertTriangle, RefreshCw, Heart,
  MapPin, X, StickyNote, Trash2, ChevronLeft, ArrowLeftRight,
} from 'lucide-react';
import { PersonalList, PersonalListEntry, PersonalListType } from '../types/index';
import { showToast } from '../components/Toast';

// ── Constants ──────────────────────────────────────────────────────────────
const LISTS_KEY = 'tripo_personal_lists';

const LIST_DEFS: Omit<PersonalList, 'entries'>[] = [
  { id: 'want_to_go',  label: 'Want to Go',   labelAr: 'أريد الذهاب',    emoji: '🔖' },
  { id: 'been_there',  label: 'Been There',   labelAr: 'زرته',            emoji: '✅' },
  { id: 'going_again', label: 'Going Again',  labelAr: 'سأعود مجدداً',   emoji: '🔁' },
  { id: 'favorites',   label: 'Favorites',    labelAr: 'المفضلة',         emoji: '⭐' },
  { id: 'avoid',       label: 'Avoid',        labelAr: 'تجنّب',           emoji: '🚫' },
];

// ── Storage helpers ─────────────────────────────────────────────────────────
function loadLists(): PersonalList[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    const stored: Partial<PersonalList>[] = raw ? JSON.parse(raw) : [];
    return LIST_DEFS.map(def => {
      const found = stored.find(s => s.id === def.id);
      return { ...def, entries: found?.entries || [] };
    });
  } catch {
    return LIST_DEFS.map(def => ({ ...def, entries: [] }));
  }
}

function saveLists(lists: PersonalList[]) {
  localStorage.setItem(LISTS_KEY, JSON.stringify(lists));
}

// ── Exported helpers — used by ExploreScreen ───────────────────────────────
export function addPlaceToList(listId: PersonalListType, entry: PersonalListEntry) {
  const lists = loadLists();
  const updated = lists.map(l => {
    if (l.id !== listId) return l;
    const exists = l.entries.find(e => e.placeId === entry.placeId);
    if (exists) return l;
    return { ...l, entries: [entry, ...l.entries] };
  });
  saveLists(updated);
}

export function removePlaceFromList(listId: PersonalListType, placeId: string) {
  const lists = loadLists();
  const updated = lists.map(l =>
    l.id === listId ? { ...l, entries: l.entries.filter(e => e.placeId !== placeId) } : l
  );
  saveLists(updated);
}

export function getPlaceListMembership(placeId: string): PersonalListType[] {
  const lists = loadLists();
  return lists.filter(l => l.entries.some(e => e.placeId === placeId)).map(l => l.id);
}

// ── Design tokens ───────────────────────────────────────────────────────────
const BG       = '#050B1E';
const SURFACE  = '#081229';
const LIFTED   = '#101B36';
const MINT     = '#7CF7C8';
const MOON     = '#B8C2D6';
const SAND     = '#7F8AA3';
const BORDER   = 'rgba(255,255,255,0.08)';
const MINT_GLOW = '0 8px 24px -6px rgba(124,247,200,0.45)';

// ── Component ────────────────────────────────────────────────────────────────
export const PersonalListsScreen = ({ t, lang }: { t: any; lang?: 'en' | 'ar' }) => {
  const isRTL = lang === 'ar';
  const [lists, setLists] = useState<PersonalList[]>(() => loadLists());
  const [selectedList, setSelectedList] = useState<PersonalList | null>(null);
  const [editEntry, setEditEntry] = useState<PersonalListEntry | null>(null);
  const [editNote, setEditNote] = useState('');
  const [moveEntry, setMoveEntry] = useState<PersonalListEntry | null>(null);

  const persist = (updated: PersonalList[]) => {
    setLists(updated);
    saveLists(updated);
    if (selectedList) {
      const refreshed = updated.find(l => l.id === selectedList.id);
      if (refreshed) setSelectedList(refreshed);
    }
  };

  const removeEntry = (listId: PersonalListType, placeId: string) => {
    const updated = lists.map(l =>
      l.id === listId ? { ...l, entries: l.entries.filter(e => e.placeId !== placeId) } : l
    );
    persist(updated);
    showToast(isRTL ? 'تم الإزالة' : 'Removed', 'success');
  };

  const saveNote = () => {
    if (!editEntry || !selectedList) return;
    const updated = lists.map(l =>
      l.id === selectedList.id
        ? { ...l, entries: l.entries.map(e => e.placeId === editEntry.placeId ? { ...e, privateNote: editNote } : e) }
        : l
    );
    persist(updated);
    setEditEntry(null);
    showToast(isRTL ? 'تم حفظ الملاحظة' : 'Note saved', 'success');
  };

  const moveToList = (toListId: PersonalListType) => {
    if (!moveEntry || !selectedList) return;
    const updated = lists.map(l => {
      if (l.id === selectedList.id) return { ...l, entries: l.entries.filter(e => e.placeId !== moveEntry.placeId) };
      if (l.id === toListId) {
        if (l.entries.find(e => e.placeId === moveEntry.placeId)) return l;
        return { ...l, entries: [{ ...moveEntry, addedAt: new Date().toISOString() }, ...l.entries] };
      }
      return l;
    });
    persist(updated);
    setMoveEntry(null);
    showToast(isRTL ? 'تم النقل' : 'Moved', 'success');
  };

  const totalEntries = lists.reduce((s, l) => s + l.entries.length, 0);

  // ── Overview ─────────────────────────────────────────────────────────────
  if (!selectedList) return (
    <div className="min-h-full pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <h1 className="font-black text-white" style={{ fontSize: '1.75rem', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          {isRTL ? 'قوائمي' : 'My Lists'}
        </h1>
        <p className="mt-1 text-sm" style={{ color: SAND }}>
          {isRTL ? 'نظّم الأماكن التي تريد زيارتها' : 'Organise places you want to visit'}
        </p>
      </div>

      {/* Empty state nudge — only when completely empty */}
      {totalEntries === 0 && (
        <div className="mx-5 mb-6 rounded-2xl px-5 py-5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <p className="font-black text-white text-sm mb-1">
            {isRTL ? 'احفظ مكانك الأول' : 'Save your first place'}
          </p>
          <p className="text-xs mb-4" style={{ color: SAND }}>
            {isRTL ? 'عند تصفح الخريطة، اضغط 🔖 لحفظ أي مكان هنا.' : 'Bookmarks from the map land here.'}
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'explore' }))}
            className="px-5 py-2.5 rounded-full font-black text-xs transition-all active:scale-95"
            style={{ background: MINT, color: BG, boxShadow: MINT_GLOW }}
          >
            {isRTL ? 'افتح الخريطة' : 'Open Map'}
          </button>
        </div>
      )}

      {/* List cards */}
      <div className="px-5 space-y-2.5">
        {lists.map(list => (
          <button
            key={list.id}
            onClick={() => setSelectedList(list)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] text-left"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            {/* Icon tile */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: list.id === 'favorites' ? 'rgba(247,201,72,0.12)' : 'rgba(124,247,200,0.10)' }}
            >
              {list.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 text-left">
              <p className="font-black text-white text-sm">{isRTL ? list.labelAr : list.label}</p>
              <p className="text-xs mt-0.5" style={{ color: SAND }}>
                {list.entries.length} {isRTL ? 'مكان' : 'places'}
              </p>
            </div>

            {/* Count bubble */}
            {list.entries.length > 0 && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                style={{ background: 'rgba(124,247,200,0.15)', color: MINT }}
              >
                {list.entries.length}
              </div>
            )}

            <ChevronLeft className="w-4 h-4 shrink-0 rotate-180" style={{ color: SAND }} />
          </button>
        ))}
      </div>
    </div>
  );

  // ── Detail ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-24" style={{ background: BG }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-4" style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}` }}>
        <button
          onClick={() => setSelectedList(null)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90"
          style={{ background: LIFTED }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: MOON }} />
        </button>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: selectedList.id === 'favorites' ? 'rgba(247,201,72,0.12)' : 'rgba(124,247,200,0.10)' }}
        >
          {selectedList.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-white text-base leading-tight">
            {isRTL ? selectedList.labelAr : selectedList.label}
          </h2>
          <p className="text-xs" style={{ color: SAND }}>
            {selectedList.entries.length} {isRTL ? 'مكان' : 'places'}
          </p>
        </div>
      </div>

      {/* Entries */}
      <div className="px-5 pt-4 space-y-3">
        {selectedList.entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-4xl mb-3">{selectedList.emoji}</span>
            <p className="font-black text-white text-sm mb-1">
              {isRTL ? 'القائمة فارغة' : 'Nothing here yet'}
            </p>
            <p className="text-xs mb-5" style={{ color: SAND }}>
              {isRTL ? 'أضف أماكن من صفحة الاستكشاف' : 'Save places while browsing the map'}
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'explore' }))}
              className="px-5 py-2.5 rounded-full font-black text-xs transition-all active:scale-95"
              style={{ background: MINT, color: BG, boxShadow: MINT_GLOW }}
            >
              {isRTL ? 'تصفح الأماكن' : 'Browse places'}
            </button>
          </div>
        ) : (
          selectedList.entries.map(entry => (
            <div
              key={entry.placeId}
              className="rounded-2xl overflow-hidden"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Thumbnail */}
                {entry.placeImage ? (
                  <img
                    src={entry.placeImage}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                    alt={entry.placeName}
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: LIFTED }}
                  >
                    📍
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm truncate">{entry.placeName || (isRTL ? 'مكان' : 'Place')}</p>
                  {entry.placeCity && (
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: SAND }}>
                      <MapPin className="w-3 h-3 shrink-0" />
                      {entry.placeCity}
                    </p>
                  )}
                  {entry.privateNote && (
                    <div
                      className="mt-2 px-2.5 py-1.5 rounded-xl text-xs"
                      style={{ background: 'rgba(247,201,72,0.08)', color: MOON, border: '1px solid rgba(247,201,72,0.15)' }}
                    >
                      📝 {entry.privateNote}
                    </div>
                  )}
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(127,138,163,0.6)' }}>
                    {new Date(entry.addedAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => { setEditEntry(entry); setEditNote(entry.privateNote || ''); }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                    style={{ background: LIFTED }}
                    title={isRTL ? 'ملاحظة' : 'Note'}
                  >
                    <StickyNote className="w-3.5 h-3.5" style={{ color: '#F7C948' }} />
                  </button>
                  <button
                    onClick={() => setMoveEntry(entry)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                    style={{ background: LIFTED }}
                    title={isRTL ? 'نقل' : 'Move'}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" style={{ color: MINT }} />
                  </button>
                  <button
                    onClick={() => removeEntry(selectedList.id, entry.placeId)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                    style={{ background: LIFTED }}
                    title={isRTL ? 'إزالة' : 'Remove'}
                  >
                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#FF6B7A' }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Move bottom sheet */}
      {moveEntry && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(5,11,30,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMoveEntry(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-black text-white text-base">
                {isRTL ? 'نقل إلى قائمة' : 'Move to list'}
              </p>
              <button
                onClick={() => setMoveEntry(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: LIFTED }}
              >
                <X className="w-4 h-4" style={{ color: MOON }} />
              </button>
            </div>
            <p className="text-sm mb-4 truncate" style={{ color: SAND }}>
              {moveEntry.placeName}
            </p>
            <div className="space-y-2">
              {LIST_DEFS.filter(l => l.id !== selectedList.id).map(l => (
                <button
                  key={l.id}
                  onClick={() => moveToList(l.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
                  style={{ background: LIFTED, border: `1px solid ${BORDER}` }}
                >
                  <span className="text-xl">{l.emoji}</span>
                  <span className="font-black text-white text-sm">{isRTL ? l.labelAr : l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Private note bottom sheet */}
      {editEntry && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(5,11,30,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => setEditEntry(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-black text-white text-base">{isRTL ? 'ملاحظة خاصة' : 'Private note'}</p>
              <button
                onClick={() => setEditEntry(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: LIFTED }}
              >
                <X className="w-4 h-4" style={{ color: MOON }} />
              </button>
            </div>
            <p className="text-xs mb-3 truncate" style={{ color: SAND }}>
              {editEntry.placeName}
            </p>
            <textarea
              className="w-full rounded-2xl px-4 py-3 text-sm text-white outline-none resize-none mb-4 transition-all"
              style={{
                background: LIFTED,
                border: '1px solid rgba(255,255,255,0.10)',
                minHeight: '6rem',
              }}
              placeholder={isRTL ? 'مثل: طلبت الكابتشينو بـ 18 ريال...' : 'e.g. Great terrace seating, order the kushari...'}
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,247,200,0.5)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)')}
            />
            <button
              onClick={saveNote}
              className="w-full py-3.5 rounded-full font-black text-sm transition-all active:scale-[0.97]"
              style={{ background: MINT, color: BG, boxShadow: MINT_GLOW }}
            >
              {isRTL ? 'حفظ الملاحظة' : 'Save note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalListsScreen;
