import React, { useState, useEffect, useRef } from 'react';
import { MoreHorizontal, Plus, ChevronLeft, Search, RotateCcw, Lock, Globe, UserPlus, Loader2, X, ChevronUp, ChevronDown, Camera, ImagePlus } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { Place, Itinerary, User } from '../types/index';
import { placeAPI, itineraryAPI, privateTripAPI } from '../services/api';
import { showToast } from '../components/Toast';

const DRAFT_KEY = 'tripo_create_draft';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

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
  const [mode, setMode] = useState<'public' | 'private'>('public');
  const [title, setTitle] = useState(initialTitle || '');
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.slice(0, 6 - photos.length).map(fileToDataUrl));
    setPhotos(prev => [...prev, ...dataUrls].slice(0, 6));
    e.target.value = '';
  };

  // Private trip — friend invite state
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<User[]>([]);
  const [isSearchingFriends, setIsSearchingFriends] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);

  // Debounced friend search
  useEffect(() => {
    if (friendSearch.trim().length < 2) { setFriendResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearchingFriends(true);
      try {
        const results = await privateTripAPI.searchUsers(friendSearch.trim());
        const invited = new Set(invitedUsers.map(u => u.id));
        setFriendResults(results.filter((u: User) => !invited.has(u.id)));
      } catch { setFriendResults([]); }
      setIsSearchingFriends(false);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendSearch]);

  const addFriend = (u: User) => {
    setInvitedUsers(prev => [...prev, u]);
    setFriendResults(prev => prev.filter(r => r.id !== u.id));
    setFriendSearch('');
  };

  const removeFriend = (id: string) => setInvitedUsers(prev => prev.filter(u => u.id !== id));

  // Load draft on mount
  useEffect(() => {
    if (initialTitle) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.title || (draft.places && draft.places.length > 0)) {
          setTitle(draft.title || '');
          setSelectedPlaces(draft.places || []);
          setStartDate(draft.startDate || '');
          setEndDate(draft.endDate || '');
          setHasDraft(true);
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (title || selectedPlaces.length > 0) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, places: selectedPlaces, startDate, endDate }));
    }
  }, [title, selectedPlaces, startDate, endDate]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setTitle(''); setSelectedPlaces([]); setStartDate(''); setEndDate('');
    setHasDraft(false);
  };

  // Fetch places for search panel
  useEffect(() => {
    if (isSearchOpen && availablePlaces.length === 0) {
      const fetch = async () => {
        try {
          setIsLoading(true);
          const data = await placeAPI.getPlaces();
          setAvailablePlaces(Array.isArray(data) ? data : (data.data || data.places || []));
        } catch { /* ignore */ } finally { setIsLoading(false); }
      };
      fetch();
    }
  }, [isSearchOpen, availablePlaces.length]);

  const handleAddPlace = (p: Place) => {
    if (!selectedPlaces.find(pl => (pl._id || pl.id) === (p._id || p.id))) {
      setSelectedPlaces([...selectedPlaces, p]);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleRemovePlace = (i: number) =>
    setSelectedPlaces(selectedPlaces.filter((_, idx) => idx !== i));

  const movePlace = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selectedPlaces.length) return;
    const updated = [...selectedPlaces];
    [updated[i], updated[j]] = [updated[j], updated[i]];
    setSelectedPlaces(updated);
  };

  // Publish public trip
  const handleCreate = async () => {
    if (!title || selectedPlaces.length === 0) return;
    setPublishError(null);
    setIsPublishing(true);
    try {
      const payload: any = {
        title,
        city: 'Riyadh',
        distance: 0,
        places: selectedPlaces.map((p, i) => ({ placeId: p._id || p.id || '', order: i + 1 })),
        estimatedCost: selectedPlaces.reduce((a, p) => a + (p.avgCost || 0), 0),
        estimatedDuration: selectedPlaces.reduce((a, p) => a + (p.duration || 60), 0),
      };
      if (startDate) payload.startDate = startDate;
      if (endDate) payload.endDate = endDate;
      if (photos.length) payload.photos = photos;
      const saved = await itineraryAPI.createItinerary(payload);
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setPublishSuccess(true);
      showToast('Trip published!', 'success');
      setTimeout(() => {
        setPublishSuccess(false);
        setTitle(''); setSelectedPlaces([]); setStartDate(''); setEndDate(''); setPhotos([]);
        onSave(saved);
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to publish. Please try again.';
      setPublishError(msg);
      showToast(msg, 'error');
    } finally { setIsPublishing(false); }
  };

  // Create private trip
  const handleCreatePrivate = async () => {
    if (!title.trim()) { showToast('Please enter a trip name', 'error'); return; }
    setIsPublishing(true);
    try {
      const trip = await privateTripAPI.create({
        title: title.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        inviteIds: invitedUsers.map(u => u.id),
        places: selectedPlaces.map((p, i) => ({ placeId: p._id || p.id || '', order: i + 1 })),
      } as any);
      showToast('Private trip created!', 'success');
      localStorage.removeItem(DRAFT_KEY);
      setTitle(''); setSelectedPlaces([]); setStartDate(''); setEndDate(''); setPhotos([]);
      setInvitedUsers([]); setHasDraft(false);
      onPrivateTripCreated?.(trip);
    } catch {
      showToast('Failed to create private trip', 'error');
    } finally { setIsPublishing(false); }
  };

  const filteredPlaces = availablePlaces.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoryTags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">

      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
        <h1 className="text-lg font-bold text-slate-900">{t.newItinerary || 'Create Trip'}</h1>
        {hasDraft && mode === 'public' && (
          <button onClick={clearDraft} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
            <RotateCcw className="w-3.5 h-3.5" /> Clear draft
          </button>
        )}
      </div>

      {hasDraft && mode === 'public' && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
          <span className="text-xs font-bold text-amber-700">Draft restored — your last session was saved automatically.</span>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="px-4 pt-4 pb-0 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('public')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2 transition-all ${
            mode === 'public'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
          }`}
        >
          <Globe className="w-4 h-4" />
          Public Trip
        </button>
        <button
          type="button"
          onClick={() => setMode('private')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border-2 transition-all ${
            mode === 'private'
              ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
          }`}
        >
          <Lock className="w-4 h-4" />
          Private Trip
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">

        {/* Trip Name */}
        <Input
          label={mode === 'private' ? 'Trip Name' : (t.tripTitle || 'Trip Title')}
          placeholder={mode === 'private' ? 'e.g. Riyadh Weekend with the Crew' : (t.tripTitlePlaceholder || 'e.g., Weekend Getaway in Riyadh')}
          value={title}
          onChange={(e: any) => setTitle(e.target.value)}
        />

        {/* Photos */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Trip Photos <span className="font-normal text-slate-400 normal-case">(optional, up to 6)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((src, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                <img src={src} className="w-full h-full object-cover" alt="" />
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
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex-shrink-0"
              >
                <ImagePlus className="w-5 h-5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400">Add</span>
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Dates */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Trip Dates (Optional)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Start</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">End</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          {startDate && endDate && (
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <span>📅</span>
              {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} day trip
            </p>
          )}
        </div>

        {/* Private: Invite Friends */}
        {mode === 'private' && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Invite Friends
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={friendSearch}
                onChange={e => setFriendSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {isSearchingFriends && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Search results */}
            {friendResults.length > 0 && (
              <div className="mt-2 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
                {friendResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addFriend(u)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition text-left border-b border-slate-50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold flex-shrink-0">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 flex-shrink-0">+ Add</span>
                  </button>
                ))}
              </div>
            )}

            {/* Invited chips */}
            {invitedUsers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {invitedUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 text-[9px] font-bold">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-emerald-800">{u.name.split(' ')[0]}</span>
                    <button type="button" onClick={() => removeFriend(u.id)} className="text-emerald-400 hover:text-emerald-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {invitedUsers.length === 0 && !friendSearch && (
              <p className="text-xs text-slate-400 mt-2">
                You can also create the trip now and invite friends later.
              </p>
            )}
          </div>
        )}

        {/* Trip Stops — available in both public and private modes */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {t.stopsLabel || 'Trip Stops'}
          </label>
          <div className="space-y-3">
            {selectedPlaces.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-600 mb-1">{t.noPlacesYet || 'No stops yet'}</p>
                <p className="text-xs text-slate-400 mb-4">Add places to build your trip</p>
                <button onClick={() => setIsSearchOpen(true)} className="px-5 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition">
                  + Add First Stop
                </button>
              </div>
            ) : (
              selectedPlaces.map((p, i) => (
                <div key={p._id || p.id || i} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {p.categoryTags?.[0] || p.category || 'Place'} • {p.duration || 60} min
                    </p>
                  </div>
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => movePlace(i, -1)}
                      disabled={i === 0}
                      className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => movePlace(i, 1)}
                      disabled={i === selectedPlaces.length - 1}
                      className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => handleRemovePlace(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full py-4 border-2 border-dashed border-slate-300 bg-white rounded-2xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              <Plus className="w-5 h-5" /> {t.addPlace || 'Add Place'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {mode === 'public' && (
          <div className="flex justify-between text-sm mb-4 text-slate-600 font-medium bg-slate-50 p-3 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.totalCost || 'Est. Cost'}</span>
              <span className="font-bold text-slate-900">{selectedPlaces.reduce((a, b) => a + (b.avgCost || 0), 0)} SAR</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.time || 'Duration'}</span>
              <span className="font-bold text-slate-900">{selectedPlaces.reduce((a, b) => a + (b.duration || 60), 0)} min</span>
            </div>
          </div>
        )}

        {publishError && (
          <p className="text-red-500 text-xs font-medium mb-2 text-center">{publishError}</p>
        )}

        {mode === 'public' ? (
          <Button
            className={`w-full py-4 text-lg shadow-emerald-500/20 shadow-lg transition-all ${publishSuccess ? 'bg-emerald-700' : ''}`}
            onClick={handleCreate}
            disabled={!title || selectedPlaces.length === 0 || isPublishing}
          >
            {isPublishing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Publishing...
              </span>
            ) : publishSuccess ? '✓ Published!' : (t.publishBtn || 'Publish Trip')}
          </Button>
        ) : (
          <Button
            className="w-full py-4 text-lg shadow-emerald-500/20 shadow-lg"
            onClick={handleCreatePrivate}
            disabled={!title.trim() || isPublishing}
          >
            {isPublishing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Create Private Trip
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Place Search Overlay (public mode only) */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b border-slate-100 flex gap-3 items-center bg-white shadow-sm">
            <button onClick={() => setIsSearchOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                placeholder={t.searchPlaceholder || 'Search for a place...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 pl-10 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium">Loading places...</p>
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-medium">
                {searchQuery ? 'No places found matching your search.' : 'No places available.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlaces.map(p => (
                  <div
                    key={p._id || p.id}
                    onClick={() => handleAddPlace(p)}
                    className="flex items-center gap-4 p-3 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 rounded-2xl cursor-pointer transition-all shadow-sm group"
                  >
                    <img
                      src={p.photos?.[0] || p.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=200&q=80'}
                      className="w-16 h-16 rounded-xl object-cover"
                      alt={p.name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                          {p.categoryTags?.[0] || p.category || 'Place'}
                        </span>
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
