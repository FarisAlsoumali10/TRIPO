import React, { useState, useEffect } from 'react';
import { X, Heart, Plus, Trash2, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { WishList } from '../types/index';

interface WishListModalProps {
  onClose: () => void;
  addPlace?: { id: string; name: string; image?: string };
}

const STORAGE_KEY = 'tripo_wishlists';
const NAMES_KEY = 'tripo_wishlist_names';

const loadLists = (): WishList[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLists = (lists: WishList[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
};

const loadPlaceNames = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const savePlaceNames = (names: Record<string, string>) => {
  localStorage.setItem(NAMES_KEY, JSON.stringify(names));
};

export const WishListModal = ({ onClose, addPlace }: WishListModalProps) => {
  const [lists, setLists] = useState<WishList[]>([]);
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});
  const [newListName, setNewListName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loaded = loadLists();
    setLists(loaded);
    setPlaceNames(loadPlaceNames());

    if (addPlace) {
      const initialChecked = new Set<string>();
      loaded.forEach(list => {
        if (list.placeIds.includes(addPlace.id)) {
          initialChecked.add(list.id);
        }
      });
      setCheckedIds(initialChecked);
    }
  }, [addPlace]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleTogglePlace = (listId: string) => {
    if (!addPlace) return;

    const updated = lists.map(list => {
      if (list.id !== listId) return list;
      const has = list.placeIds.includes(addPlace.id);
      return {
        ...list,
        placeIds: has
          ? list.placeIds.filter(id => id !== addPlace.id)
          : [...list.placeIds, addPlace.id],
      };
    });

    const newChecked = new Set(checkedIds);
    if (checkedIds.has(listId)) {
      newChecked.delete(listId);
    } else {
      newChecked.add(listId);
      // Persist place name
      const updatedNames = { ...placeNames, [addPlace.id]: addPlace.name };
      setPlaceNames(updatedNames);
      savePlaceNames(updatedNames);
    }

    setCheckedIds(newChecked);
    setLists(updated);
    saveLists(updated);
    showToast('Saved!');
  };

  const handleCreateList = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;

    const newList: WishList = {
      id: Date.now().toString(),
      name: trimmed,
      placeIds: addPlace ? [addPlace.id] : [],
      createdAt: new Date().toISOString(),
    };

    if (addPlace) {
      const updatedNames = { ...placeNames, [addPlace.id]: addPlace.name };
      setPlaceNames(updatedNames);
      savePlaceNames(updatedNames);
      const newChecked = new Set(checkedIds);
      newChecked.add(newList.id);
      setCheckedIds(newChecked);
    }

    const updated = [...lists, newList];
    setLists(updated);
    saveLists(updated);
    setNewListName('');
    setShowNewInput(false);
    showToast(`"${trimmed}" created!`);
  };

  const handleDeleteList = (listId: string) => {
    const updated = lists.filter(l => l.id !== listId);
    setLists(updated);
    saveLists(updated);
    if (expandedListId === listId) setExpandedListId(null);
  };

  const toggleExpand = (listId: string) => {
    setExpandedListId(prev => (prev === listId ? null : listId));
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-full shadow-lg animate-in slide-in-from-top duration-200">
          {toast}
        </div>
      )}

      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-extrabold text-slate-900">
              {addPlace ? `Save "${addPlace.name}"` : 'My Wish Lists'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {lists.length === 0 && !showNewInput && (
            <div className="text-center py-12 text-slate-400">
              <Heart className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="font-medium text-sm">No wish lists yet.</p>
              <p className="text-xs mt-1">Create one to start saving places.</p>
            </div>
          )}

          {lists.map(list => (
            <div
              key={list.id}
              className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4">
                {/* Checkbox toggle (addPlace mode) */}
                {addPlace ? (
                  <button
                    onClick={() => handleTogglePlace(list.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      checkedIds.has(list.id)
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'border-slate-300 bg-white'
                    }`}
                    aria-label="Toggle save to list"
                  >
                    {checkedIds.has(list.id) && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-4 h-4 text-emerald-600" />
                  </div>
                )}

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => !addPlace && toggleExpand(list.id)}
                >
                  <p className="font-bold text-sm text-slate-900 truncate">{list.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {list.placeIds.length} {list.placeIds.length === 1 ? 'place' : 'places'}
                  </p>
                </div>

                {!addPlace && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleExpand(list.id)}
                      className="p-1.5 rounded-full hover:bg-slate-200 transition-colors"
                      aria-label="Toggle list"
                    >
                      {expandedListId === list.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-1.5 rounded-full hover:bg-red-50 transition-colors"
                      aria-label="Delete list"
                    >
                      <Trash2 className="w-4 h-4 text-slate-300 hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded place names (browse mode only) */}
              {!addPlace && expandedListId === list.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
                  {list.placeIds.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No places saved yet.</p>
                  ) : (
                    list.placeIds.map(pid => (
                      <div
                        key={pid}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="truncate">{placeNames[pid] || pid}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {/* New list inline input */}
          {showNewInput && (
            <div className="bg-slate-50 rounded-2xl border border-emerald-200 p-4 flex gap-2">
              <input
                autoFocus
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateList()}
                placeholder="List name..."
                className="flex-1 bg-white px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setShowNewInput(false); setNewListName(''); }}
                className="p-2 rounded-xl hover:bg-slate-200 transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-8 pt-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={() => setShowNewInput(true)}
            className="w-full py-3.5 border-2 border-dashed border-slate-300 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> New List
          </button>
        </div>
      </div>
    </div>
  );
};
