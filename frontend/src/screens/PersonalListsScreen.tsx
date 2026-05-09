import React, { useState } from 'react';
import {
  Bookmark, Check, Star, AlertTriangle, RefreshCw, Heart,
  MapPin, X, StickyNote, Trash2, ChevronLeft, ArrowLeftRight,
} from 'lucide-react';
import { PersonalList, PersonalListEntry, PersonalListType } from '../types/index';
import { showToast } from '../components/Toast';

// ── Constants ──────────────────────────────────────────────────────────────
const LISTS_KEY = 'tripo_personal_lists';

const getListDefs = (t: any) => [
  { id: 'want_to_go',  label: t.lists.listWantToGo,   emoji: '🔖' },
  { id: 'been_there',  label: t.lists.listBeenThere,   emoji: '✅' },
  { id: 'going_again', label: t.lists.listGoingAgain,  emoji: '🔁' },
  { id: 'favorites',   label: t.lists.listFavorites,   emoji: '⭐' },
  { id: 'avoid',       label: t.lists.listAvoid,       emoji: '🚫' },
];

// ── Storage helpers ─────────────────────────────────────────────────────────
function loadLists(): PersonalList[] {
  try {
    const raw = localStorage.getItem(LISTS_KEY);
    const stored: Partial<PersonalList>[] = raw ? JSON.parse(raw) : [];
    return getListDefs({ lists: {} }).map(def => {
      const found = stored.find(s => s.id === def.id);
      return { ...def, entries: found?.entries || [] } as PersonalList;
    });
  } catch {
    return getListDefs({ lists: {} }).map(def => ({ ...def, entries: [] } as PersonalList));
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

// Design tokens moved to Tailwind classes

// ── Component ────────────────────────────────────────────────────────────────
export const PersonalListsScreen = ({ t, lang }: { t: any; lang?: 'en' | 'ar' }) => {
  const isRTL = lang === 'ar';
  const ls = t.lists;
  const LIST_DEFS = getListDefs(t);
  
  const [lists, setLists] = useState<PersonalList[]>(() => {
    const stored = loadLists();
    // Refresh labels from current translations
    return LIST_DEFS.map(def => {
      const found = stored.find(s => s.id === def.id);
      return { ...def, entries: found?.entries || [] } as PersonalList;
    });
  });
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
    showToast(ls.toastRemoved, 'success');
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
    showToast(ls.toastNoteSaved, 'success');
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
    showToast(ls.toastMoved, 'success');
  };

  const totalEntries = lists.reduce((s, l) => s + l.entries.length, 0);

  // ── Overview ─────────────────────────────────────────────────────────────
  if (!selectedList) return (
    <div className="min-h-full pb-24 bg-white dark:bg-navy-950">
      {/* Header */}
      <div className="px-5 pt-8 pb-6">
        <h1 className="font-black text-slate-900 dark:text-white" style={{ fontSize: '1.75rem', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          {ls.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          {ls.subtitle}
        </p>
      </div>

      {/* Empty state nudge — only when completely empty */}
      {totalEntries === 0 && (
        <div className="mx-5 mb-6 rounded-2xl px-5 py-5 bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-white/8">
          <p className="font-black text-slate-900 dark:text-white text-sm mb-1">
            {ls.emptyStateTitle}
          </p>
          <p className="text-xs mb-4 text-slate-500 dark:text-slate-500">
            {ls.emptyStateDesc}
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'explore' }))}
            className="px-5 py-2.5 rounded-full font-black text-xs transition-all active:scale-95 bg-oasis-spring text-midnight shadow-mint-glow"
          >
            {ls.openMap}
          </button>
        </div>
      )}

      {/* List cards */}
      <div className="px-5 space-y-2.5">
        {lists.map(list => (
          <button
            key={list.id}
            onClick={() => setSelectedList(list)}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98] text-left bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-white/8"
          >
            {/* Icon tile */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${list.id === 'favorites' ? 'bg-yellow-400/10' : 'bg-oasis-spring/10'}`}
            >
              {list.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 text-left">
              <p className="font-black text-slate-900 dark:text-white text-sm">{list.label}</p>
              <p className="text-xs mt-0.5 text-slate-500 dark:text-slate-500">
                {ls.placesCount.replace('{n}', String(list.entries.length))}
              </p>
            </div>

            {/* Count bubble */}
            {list.entries.length > 0 && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 bg-oasis-spring/20 text-oasis-spring"
              >
                {list.entries.length}
              </div>
            )}

            <ChevronLeft className="w-4 h-4 shrink-0 rotate-180 text-slate-400 dark:text-slate-500" />
          </button>
        ))}
      </div>
    </div>
  );

  // ── Detail ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-24 bg-white dark:bg-navy-950">
      {/* Header */}
      <div className="px-5 pt-6 pb-5 flex items-center gap-4 bg-slate-50 dark:bg-navy-900 border-b border-slate-100 dark:border-white/8">
        <button
          onClick={() => setSelectedList(null)}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 bg-slate-100 dark:bg-navy-800"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </button>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${selectedList.id === 'favorites' ? 'bg-yellow-400/10' : 'bg-oasis-spring/10'}`}
        >
          {selectedList.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-slate-900 dark:text-white text-base leading-tight">
            {selectedList.label}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            {ls.placesCount.replace('{n}', String(selectedList.entries.length))}
          </p>
        </div>
      </div>

      {/* Entries */}
      <div className="px-5 pt-4 space-y-3">
        {selectedList.entries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="text-4xl mb-3">{selectedList.emoji}</span>
            <p className="font-black text-slate-900 dark:text-white text-sm mb-1">
              {ls.nothingHere}
            </p>
            <p className="text-xs mb-5 text-slate-500 dark:text-slate-500">
              {ls.savePlacesDesc}
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'explore' }))}
              className="px-5 py-2.5 rounded-full font-black text-xs transition-all active:scale-95 bg-oasis-spring text-midnight shadow-mint-glow"
            >
              {ls.browsePlaces}
            </button>
          </div>
        ) : (
          selectedList.entries.map(entry => (
            <div
              key={entry.placeId}
              className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-white/8"
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
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-xl shrink-0 bg-slate-100 dark:bg-navy-800"
                  >
                    📍
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 dark:text-white text-sm truncate">{entry.placeName || (isRTL ? 'مكان' : 'Place')}</p>
                  {entry.placeCity && (
                    <p className="text-xs flex items-center gap-1 mt-0.5 text-slate-500 dark:text-slate-500">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {entry.placeCity}
                    </p>
                  )}
                  {entry.privateNote && (
                    <div
                      className="mt-2 px-2.5 py-1.5 rounded-xl text-xs bg-yellow-400/10 text-slate-600 dark:text-slate-400 border border-yellow-400/20"
                    >
                      📝 {entry.privateNote}
                    </div>
                  )}
                  <p className="text-xs mt-1.5 text-slate-400/60">
                    {new Date(entry.addedAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => { setEditEntry(entry); setEditNote(entry.privateNote || ''); }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 bg-slate-100 dark:bg-navy-800"
                    title={ls.actionNote}
                  >
                    <StickyNote className="w-3.5 h-3.5 text-yellow-500" />
                  </button>
                  <button
                    onClick={() => setMoveEntry(entry)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 bg-slate-100 dark:bg-navy-800"
                    title={ls.actionMove}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-oasis-spring" />
                  </button>
                  <button
                    onClick={() => removeEntry(selectedList.id, entry.placeId)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 bg-slate-100 dark:bg-navy-800"
                    title={ls.actionRemove}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 dark:bg-navy-950/80 backdrop-blur-sm"
          onClick={() => setMoveEntry(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8 bg-white dark:bg-navy-900 border-t border-slate-100 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-black text-slate-900 dark:text-white text-base">
                {ls.moveTitle}
              </p>
              <button
                onClick={() => setMoveEntry(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-navy-800"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <p className="text-sm mb-4 truncate text-slate-500 dark:text-slate-500">
              {moveEntry.placeName}
            </p>
            <div className="space-y-2">
              {LIST_DEFS.filter(l => l.id !== selectedList.id).map(l => (
                <button
                  key={l.id}
                  onClick={() => moveToList(l.id as PersonalListType)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] bg-slate-50 dark:bg-navy-950 border border-slate-100 dark:border-white/8"
                >
                  <span className="text-xl">{l.emoji}</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Private note bottom sheet */}
      {editEntry && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 dark:bg-navy-950/80 backdrop-blur-sm"
          onClick={() => setEditEntry(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-5 pt-5 pb-8 bg-white dark:bg-navy-900 border-t border-slate-100 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-black text-slate-900 dark:text-white text-base">{ls.privateNoteTitle}</p>
              <button
                onClick={() => setEditEntry(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-navy-800"
              >
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <p className="text-xs mb-3 truncate text-slate-500 dark:text-slate-500">
              {editEntry.placeName}
            </p>
            <textarea
              className="w-full rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none mb-4 transition-all bg-slate-100 dark:bg-navy-800 border border-slate-200 dark:border-white/10 focus:border-oasis-spring/50"
              style={{ minHeight: '6rem' }}
              placeholder={ls.notePlaceholder}
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
            />
            <button
              onClick={saveNote}
              className="w-full py-3.5 rounded-full font-black text-sm transition-all active:scale-[0.97] bg-oasis-spring text-midnight shadow-mint-glow"
            >
              {ls.saveNote}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalListsScreen;
