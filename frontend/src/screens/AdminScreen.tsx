import React, { useState, useEffect } from 'react';
import { Plus, X, Shield, RefreshCw, AlertCircle, Trash2, Calendar, MapPin } from 'lucide-react';
import { Place } from '../types/index';
import { placeAPI, eventAPI } from '../services/api';

// ── Place form ───────────────────────────────────────────────────────────────

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
type Season = typeof SEASONS[number];

interface PlaceFormData {
  name: string;
  city: string;
  description: string;
  categoryTags: string;
  lat: string;
  lng: string;
  avgCost: string;
  duration: string;
  priceRange: '1' | '2' | '3' | '4';
  photoUrl: string;
  bestSeasons: Season[];
  accessibility: { wheelchair: boolean; parking: boolean; family: boolean };
}

const defaultPlaceForm = (): PlaceFormData => ({
  name: '',
  city: '',
  description: '',
  categoryTags: '',
  lat: '',
  lng: '',
  avgCost: '',
  duration: '',
  priceRange: '2',
  photoUrl: '',
  bestSeasons: [],
  accessibility: { wheelchair: false, parking: false, family: false },
});

// ── Event form ───────────────────────────────────────────────────────────────

const EVENT_CATEGORIES = ['Business & Tech', 'Culture', 'Sports', 'National'];

const COLOR_OPTIONS = [
  { label: 'Emerald', value: '#10b981' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Slate', value: '#0f172a' },
];

interface EventFormData {
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  location: string;
  city: string;
  description: string;
  image: string;
  price: string;
  isFree: boolean;
  admission: string;
  website: string;
  hours: string;
  gettingThere: string;
  mapQuery: string;
  color: string;
}

const defaultEventForm = (): EventFormData => ({
  title: '',
  category: 'Culture',
  startDate: '',
  endDate: '',
  location: '',
  city: '',
  description: '',
  image: '',
  price: '',
  isFree: false,
  admission: '',
  website: '',
  hours: '',
  gettingThere: '',
  mapQuery: '',
  color: '#10b981',
});

// ── Admin Screen ─────────────────────────────────────────────────────────────

export const AdminScreen: React.FC<{ t: any }> = ({ t }) => {
  const [activeTab, setActiveTab] = useState<'places' | 'events'>('places');

  // Places
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [placeForm, setPlaceForm] = useState<PlaceFormData>(defaultPlaceForm());
  const [placeSubmitting, setPlaceSubmitting] = useState(false);
  const [deletingPlaceId, setDeletingPlaceId] = useState<string | null>(null);

  // Events
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState<EventFormData>(defaultEventForm());
  const [eventSubmitting, setEventSubmitting] = useState(false);

  useEffect(() => {
    setEventsLoading(true);
    eventAPI.getEvents().then(setEvents).catch(() => setEvents([])).finally(() => setEventsLoading(false));
  }, []);

  // Shared
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // ── Places ────────────────────────────────────────────────────────────────

  const fetchPlaces = async () => {
    try {
      setPlacesLoading(true);
      setPlacesError(null);
      const data = await placeAPI.getPlaces();
      setPlaces(data);
    } catch {
      setPlacesError('Failed to load places. Check your connection.');
    } finally {
      setPlacesLoading(false);
    }
  };

  useEffect(() => { fetchPlaces(); }, []);

  const handleSeasonToggle = (season: Season) => {
    setPlaceForm(prev => ({
      ...prev,
      bestSeasons: prev.bestSeasons.includes(season)
        ? prev.bestSeasons.filter(s => s !== season)
        : [...prev.bestSeasons, season],
    }));
  };

  const handleAccessibilityToggle = (key: keyof PlaceFormData['accessibility']) => {
    setPlaceForm(prev => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: !prev.accessibility[key] },
    }));
  };

  const handlePlaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeForm.name.trim() || !placeForm.city.trim()) return;

    const payload: any = {
      name: placeForm.name.trim(),
      city: placeForm.city.trim(),
      description: placeForm.description.trim(),
      categoryTags: placeForm.categoryTags.split(',').map(s => s.trim()).filter(Boolean),
      coordinates: {
        lat: parseFloat(placeForm.lat) || 0,
        lng: parseFloat(placeForm.lng) || 0,
      },
      avgCost: parseFloat(placeForm.avgCost) || 0,
      duration: parseFloat(placeForm.duration) || 0,
      priceRange: parseInt(placeForm.priceRange, 10) as 1 | 2 | 3 | 4,
      bestSeasons: placeForm.bestSeasons,
      accessibility: placeForm.accessibility,
    };
    if (placeForm.photoUrl.trim()) payload.photos = [placeForm.photoUrl.trim()];

    try {
      setPlaceSubmitting(true);
      await placeAPI.createPlace(payload);
      setShowPlaceModal(false);
      setPlaceForm(defaultPlaceForm());
      await fetchPlaces();
      showSuccess('Place created successfully!');
    } catch (e: any) {
      alert('Failed to create place: ' + (e?.response?.data?.message || e.message || 'Unknown error'));
    } finally {
      setPlaceSubmitting(false);
    }
  };

  const handleDeletePlace = async (place: Place) => {
    const id = place._id || place.id;
    if (!id) return;
    if (!confirm(`Delete "${place.name}"? This cannot be undone.`)) return;
    try {
      setDeletingPlaceId(id);
      await placeAPI.updatePlace(id, { status: 'deactivated' });
      setPlaces(prev => prev.filter(p => (p._id || p.id) !== id));
      showSuccess(`"${place.name}" removed.`);
    } catch (e: any) {
      alert('Failed to delete: ' + (e?.response?.data?.message || e.message));
    } finally {
      setDeletingPlaceId(null);
    }
  };

  // ── Events ────────────────────────────────────────────────────────────────

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEventSubmitting(true);
      const created = await eventAPI.createEvent({
        title: eventForm.title.trim(),
        category: eventForm.category,
        date: eventForm.startDate,
        endDate: eventForm.endDate || eventForm.startDate,
        locationName: eventForm.location.trim(),
        city: eventForm.city.trim(),
        description: eventForm.description.trim(),
        image: eventForm.image.trim() || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
        color: eventForm.color,
        isFree: eventForm.isFree,
        fee: eventForm.isFree ? 0 : (parseFloat(eventForm.price) || 0),
        website: eventForm.website.trim(),
        hours: eventForm.hours.trim(),
        gettingThere: eventForm.gettingThere.trim(),
        mapQuery: eventForm.mapQuery.trim() || eventForm.location.trim().replace(/\s+/g, '+'),
      });
      setEvents(prev => [...prev, created.data ?? created]);
      setShowEventModal(false);
      setEventForm(defaultEventForm());
      showSuccess(`"${eventForm.title}" added!`);
    } catch {
      alert('Failed to create event');
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleDeleteEvent = (event: any) => {
    if (!confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    const id = event._id ?? event.id;
    setEvents(prev => prev.filter(e => (e._id ?? e.id) !== id));
    showSuccess(`"${event.title}" removed.`);
    // Best-effort backend delete (no dedicated delete endpoint yet — just filter client-side)
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 max-w-5xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Admin Panel</h1>
          <p className="text-sm text-slate-500">Manage places and events</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl">
        {(['places', 'events'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* ── Places tab ── */}
      {activeTab === 'places' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Places</h2>
            <button
              onClick={() => { setShowPlaceModal(true); setPlaceForm(defaultPlaceForm()); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Place
            </button>
          </div>

          {placesLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-slate-300 animate-spin" />
            </div>
          ) : placesError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <AlertCircle className="w-10 h-10 text-red-300" />
              <p className="text-slate-600 font-medium">{placesError}</p>
              <button
                onClick={fetchPlaces}
                className="px-5 py-2 bg-emerald-600 text-white rounded-full text-sm font-semibold hover:bg-emerald-700 transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">{places.length} place{places.length !== 1 ? 's' : ''}</span>
                <button onClick={fetchPlaces} className="p-1.5 rounded-full hover:bg-slate-100 transition text-slate-400">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {places.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-sm">No places yet. Add the first one!</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {places.map(place => {
                    const id = place._id || place.id || '';
                    const isDeactivated = (place as any).status === 'deactivated';
                    return (
                      <div key={id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                        <img
                          src={place.photos?.[0] || (place as any).image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=60'}
                          alt={place.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=60'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 truncate text-sm">{place.name}</p>
                            {isDeactivated && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full flex-shrink-0">Removed</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {place.city}{place.categoryTags?.length ? ` · ${place.categoryTags[0]}` : ''}
                          </p>
                        </div>
                        {!isDeactivated && (
                          <button
                            onClick={() => handleDeletePlace(place)}
                            disabled={deletingPlaceId === id}
                            className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Delete place"
                          >
                            {deletingPlaceId === id
                              ? <RefreshCw className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Events tab ── */}
      {activeTab === 'events' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Events</h2>
            <button
              onClick={() => { setShowEventModal(true); setEventForm(defaultEventForm()); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
            </div>
            {events.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">No events. Add the first one!</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {events.map(event => {
                  const key = event._id ?? event.id ?? String(Math.random());
                  const eventDate = event.date ? new Date(event.date).toLocaleDateString() : event.startDate ?? '';
                  const img = event.image ?? event.coverImage ?? 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=60';
                  return (
                    <div key={key} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                      <img
                        src={img}
                        alt={event.title}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&q=60'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 truncate text-sm">{event.title}</p>
                          <span
                            className="px-2 py-0.5 text-white text-xs font-bold rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.color ?? '#10b981' }}
                          >
                            {event.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {eventDate}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.city ?? event.locationName}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event)}
                        className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Add Place Modal ── */}
      {showPlaceModal && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPlaceModal(false)}>
          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl z-10">
              <h3 className="text-lg font-extrabold text-slate-900">Add New Place</h3>
              <button onClick={() => setShowPlaceModal(false)} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceSubmit} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Name *</label>
                  <input required value={placeForm.name} onChange={e => setPlaceForm(p => ({ ...p, name: e.target.value }))} placeholder="Place name" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">City *</label>
                  <input required value={placeForm.city} onChange={e => setPlaceForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Riyadh" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={placeForm.description} onChange={e => setPlaceForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this place..." rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category Tags</label>
                <input value={placeForm.categoryTags} onChange={e => setPlaceForm(p => ({ ...p, categoryTags: e.target.value }))} placeholder="Outdoor, Nature, Family (comma-separated)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Latitude</label>
                  <input type="number" step="any" value={placeForm.lat} onChange={e => setPlaceForm(p => ({ ...p, lat: e.target.value }))} placeholder="24.7136" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Longitude</label>
                  <input type="number" step="any" value={placeForm.lng} onChange={e => setPlaceForm(p => ({ ...p, lng: e.target.value }))} placeholder="46.6753" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Avg Cost (SAR)</label>
                  <input type="number" min="0" value={placeForm.avgCost} onChange={e => setPlaceForm(p => ({ ...p, avgCost: e.target.value }))} placeholder="0" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration (min)</label>
                  <input type="number" min="0" value={placeForm.duration} onChange={e => setPlaceForm(p => ({ ...p, duration: e.target.value }))} placeholder="60" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price Range</label>
                  <select value={placeForm.priceRange} onChange={e => setPlaceForm(p => ({ ...p, priceRange: e.target.value as PlaceFormData['priceRange'] }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                    <option value="1">$ Free/Cheap</option>
                    <option value="2">$$ Moderate</option>
                    <option value="3">$$$ Pricey</option>
                    <option value="4">$$$$ Luxury</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Photo URL</label>
                <input type="url" value={placeForm.photoUrl} onChange={e => setPlaceForm(p => ({ ...p, photoUrl: e.target.value }))} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Best Seasons</label>
                <div className="flex gap-3 flex-wrap">
                  {SEASONS.map(season => (
                    <label key={season} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={placeForm.bestSeasons.includes(season)} onChange={() => handleSeasonToggle(season)} className="w-4 h-4 rounded accent-emerald-600" />
                      <span className="text-sm text-slate-700 capitalize">{season}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Accessibility</label>
                <div className="flex gap-4 flex-wrap">
                  {(['wheelchair', 'parking', 'family'] as const).map(key => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={placeForm.accessibility[key]} onChange={() => handleAccessibilityToggle(key)} className="w-4 h-4 rounded accent-emerald-600" />
                      <span className="text-sm text-slate-700 capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={placeSubmitting} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-60">
                  {placeSubmitting ? 'Creating...' : 'Create Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Event Modal ── */}
      {showEventModal && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEventModal(false)}>
          <div
            className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between rounded-t-3xl z-10">
              <h3 className="text-lg font-extrabold text-slate-900">Add New Event</h3>
              <button onClick={() => setShowEventModal(false)} className="p-2 rounded-full hover:bg-slate-100 transition text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEventSubmit} className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Title *</label>
                <input required value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} placeholder="Event name" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {/* Category & Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category *</label>
                  <select value={eventForm.category} onChange={e => setEventForm(p => ({ ...p, category: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white">
                    {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Badge Color</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEventForm(p => ({ ...p, color: c.value }))}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${eventForm.color === c.value ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                  <input required type="date" value={eventForm.startDate} onChange={e => setEventForm(p => ({ ...p, startDate: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                  <input type="date" value={eventForm.endDate} onChange={e => setEventForm(p => ({ ...p, endDate: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              {/* Location & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Venue / Location</label>
                  <input value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. King Fahd Stadium" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
                  <input value={eventForm.city} onChange={e => setEventForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Riyadh" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the event..." rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Image URL</label>
                <input type="url" value={eventForm.image} onChange={e => setEventForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {/* Price / Free */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input type="checkbox" checked={eventForm.isFree} onChange={e => setEventForm(p => ({ ...p, isFree: e.target.checked }))} className="w-4 h-4 rounded accent-emerald-600" />
                  <span className="text-sm font-bold text-slate-700">Free event</span>
                </label>
                {!eventForm.isFree && (
                  <input value={eventForm.price} onChange={e => setEventForm(p => ({ ...p, price: e.target.value }))} placeholder="e.g. From SAR 200" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                )}
              </div>

              {/* Hours */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Opening Hours</label>
                <input value={eventForm.hours} onChange={e => setEventForm(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 9:00 AM – 7:00 PM daily" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {/* Admission */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">How to Get In</label>
                <textarea value={eventForm.admission} onChange={e => setEventForm(p => ({ ...p, admission: e.target.value }))} placeholder="Ticket info, registration details..." rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Website</label>
                <input type="url" value={eventForm.website} onChange={e => setEventForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {/* Getting There */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Getting There</label>
                <textarea value={eventForm.gettingThere} onChange={e => setEventForm(p => ({ ...p, gettingThere: e.target.value }))} placeholder="Transport, parking, directions..." rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
              </div>

              {/* Map Query */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Maps Search Query</label>
                <input value={eventForm.mapQuery} onChange={e => setEventForm(p => ({ ...p, mapQuery: e.target.value }))} placeholder="e.g. King+Fahd+Stadium+Riyadh (auto-filled if blank)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              <div className="pt-2">
                <button type="submit" disabled={eventSubmitting} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-60">
                  {eventSubmitting ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
