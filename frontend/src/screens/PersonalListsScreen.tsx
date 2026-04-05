import React, { useState, useEffect } from 'react';
import {
  Bookmark, Check, Star, AlertTriangle, RefreshCw, Heart,
  MapPin, X, Edit3, StickyNote, Trash2, ChevronLeft, Plus,
} from 'lucide-react';
import { PersonalList, PersonalListEntry, PersonalListType, Place } from '../types/index';
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

const LIST_COLORS: Record<PersonalListType, string> = {
  want_to_go:  'bg-blue-50 text-blue-700 border-blue-200',
  been_there:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  going_again: 'bg-purple-50 text-purple-700 border-purple-200',
  favorites:   'bg-amber-50 text-amber-700 border-amber-200',
  avoid:       'bg-red-50 text-red-700 border-red-200',
};

const LIST_HEADER_COLORS: Record<PersonalListType, string> = {
  want_to_go:  'linear-gradient(135deg,#3b82f6,#6366f1)',
  been_there:  'linear-gradient(135deg,#10b981,#0d9488)',
  going_again: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  favorites:   'linear-gradient(135deg,#f59e0b,#f97316)',
  avoid:       'linear-gradient(135deg,#ef4444,#dc2626)',
};

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

// ── Exported helper — add a place to a list from any screen ───────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export const PersonalListsScreen = ({ t }: { t: any }) => {
  const [lists, setLists] = useState<PersonalList[]>(() => loadLists());
  const [selectedList, setSelectedList] = useState<PersonalList | null>(null);
  const [editEntry, setEditEntry] = useState<PersonalListEntry | null>(null);
  const [editNote, setEditNote] = useState('');

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
    showToast('تم الإزالة', 'success');
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
    showToast('تم حفظ الملاحظة', 'success');
  };

  const moveToList = (fromListId: PersonalListType, toListId: PersonalListType, entry: PersonalListEntry) => {
    const updated = lists.map(l => {
      if (l.id === fromListId) return { ...l, entries: l.entries.filter(e => e.placeId !== entry.placeId) };
      if (l.id === toListId) {
        if (l.entries.find(e => e.placeId === entry.placeId)) return l;
        return { ...l, entries: [{ ...entry, addedAt: new Date().toISOString() }, ...l.entries] };
      }
      return l;
    });
    persist(updated);
    showToast('تم النقل', 'success');
  };

  // ── List overview ────────────────────────────────────────────────────────
  if (!selectedList) return (
    <div className="min-h-full pb-24 bg-slate-50">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black text-slate-900">قوائمي الشخصية</h1>
        <p className="text-xs text-slate-400 mt-0.5">نظّم أماكنك المفضلة والمخططة</p>
      </div>

      <div className="px-4 space-y-3">
        {lists.map(list => (
          <button
            key={list.id}
            onClick={() => setSelectedList(list)}
            className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 active:scale-[0.98] transition-all text-right"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: LIST_HEADER_COLORS[list.id] }}
            >
              {list.emoji}
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="font-black text-slate-900 text-sm">{list.labelAr}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{list.entries.length} مكان</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
          </button>
        ))}
      </div>

      {/* Usage hint */}
      <div className="mx-4 mt-4 p-4 bg-emerald-50 rounded-3xl border border-emerald-100">
        <p className="text-xs font-black text-emerald-700 mb-1">💡 كيف تستخدم القوائم؟</p>
        <p className="text-[10px] text-emerald-600">
          عند تصفح الأماكن، اضغط على زر القائمة (🔖) لإضافة أي مكان مباشرة إلى قائمتك المفضلة.
        </p>
      </div>
    </div>
  );

  // ── List detail ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-24 bg-slate-50">
      {/* Header */}
      <div
        className="px-4 pt-8 pb-6 relative"
        style={{ background: LIST_HEADER_COLORS[selectedList.id] }}
      >
        <button onClick={() => setSelectedList(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center active:scale-90">
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="text-4xl mb-2">{selectedList.emoji}</div>
        <h2 className="text-xl font-black text-white">{selectedList.labelAr}</h2>
        <p className="text-white/70 text-xs">{selectedList.entries.length} مكان مضاف</p>
      </div>

      {/* Entries */}
      <div className="px-4 pt-4 space-y-3">
        {selectedList.entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">{selectedList.emoji}</div>
            <p className="font-black text-slate-500">القائمة فارغة</p>
            <p className="text-xs text-slate-400 mt-1">أضف أماكن من صفحة الاستكشاف</p>
          </div>
        ) : (
          selectedList.entries.map(entry => (
            <div key={entry.placeId} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                {entry.placeImage ? (
                  <img src={entry.placeImage} className="w-14 h-14 rounded-2xl object-cover shrink-0" alt={entry.placeName} />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">📍</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-sm truncate">{entry.placeName || 'مكان'}</p>
                  {entry.placeCity && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />{entry.placeCity}
                    </p>
                  )}
                  {entry.privateNote && (
                    <p className="text-[10px] text-slate-500 mt-1 bg-amber-50 px-2 py-1 rounded-xl border border-amber-100">
                      📝 {entry.privateNote}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-300 mt-1">
                    أُضيف {new Date(entry.addedAt).toLocaleDateString('ar-SA')}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => { setEditEntry(entry); setEditNote(entry.privateNote || ''); }}
                    className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center active:scale-90"
                  >
                    <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                  <button
                    onClick={() => removeEntry(selectedList.id, entry.placeId)}
                    className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center active:scale-90"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Move to other list */}
              <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                {LIST_DEFS.filter(l => l.id !== selectedList.id).map(l => (
                  <button
                    key={l.id}
                    onClick={() => moveToList(selectedList.id, l.id, entry)}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border text-[10px] font-black transition-all active:scale-95 ${LIST_COLORS[l.id]}`}
                  >
                    {l.emoji} {l.labelAr}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Private note editor modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-slate-800">ملاحظة خاصة</p>
              <button onClick={() => setEditEntry(null)} className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-2">
              {editEntry.placeName} — سجّل ما طلبت، ما أعجبك، الأسعار التقريبية...
            </p>
            <textarea
              className="w-full px-4 py-3 bg-slate-50 rounded-2xl text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-300 resize-none mb-4"
              placeholder="مثل: طلبت الكابتشينو بـ 18 ريال، الجلسة خارجية ممتازة..."
              rows={4}
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
            />
            <button
              onClick={saveNote}
              className="w-full py-3 bg-emerald-600 text-white font-black text-sm rounded-2xl active:scale-95 transition-transform"
            >
              حفظ الملاحظة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalListsScreen;
