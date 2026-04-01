import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, FileText, Tent, Compass } from 'lucide-react';
import { placeAPI, itineraryAPI, rentalAPI, tourAPI } from '../services/api';
import { MOCK_PLACES } from '../screens/HomeScreen';
import { MOCK_TOURS } from '../screens/ToursScreen';
import { MOCK_RENTALS } from '../screens/RentalsScreen';

interface SearchResult {
  id: string;
  type: 'place' | 'itinerary' | 'rental' | 'tour';
  title: string;
  subtitle?: string;
  image?: string;
}

// Maps result type → app tab name (matches App.tsx tab ids)
const TYPE_TAB: Record<SearchResult['type'], string> = {
  place:     'places',
  tour:      'tours',
  rental:    'rentals',
  itinerary: 'my_trips',
};

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  place:     'Place',
  tour:      'Tour',
  rental:    'Rental',
  itinerary: 'Trip',
};

const TYPE_BADGE: Record<SearchResult['type'], string> = {
  place:     'bg-teal-50 text-teal-700',
  tour:      'bg-purple-50 text-purple-700',
  rental:    'bg-orange-50 text-orange-700',
  itinerary: 'bg-blue-50 text-blue-700',
};

export const GlobalSearch = ({
  onNavigate,
}: {
  onNavigate: (tab: string, id?: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      const q = query.toLowerCase();
      const collected: SearchResult[] = [];

      // ── Places ──────────────────────────────────────────────
      try {
        const list = await placeAPI.getPlaces();
        const data = Array.isArray(list) ? list : [];
        const source = data.length > 0 ? data : MOCK_PLACES;
        source
          .filter((p: any) =>
            p.name?.toLowerCase().includes(q) ||
            p.city?.toLowerCase().includes(q) ||
            p.categoryTags?.some((t: string) => t.toLowerCase().includes(q))
          )
          .slice(0, 4)
          .forEach((p: any) => collected.push({
            id: p.id || p._id || '',
            type: 'place',
            title: p.name,
            subtitle: [p.city, p.categoryTags?.[0]].filter(Boolean).join(' · '),
            image: p.photos?.[0] || p.image,
          }));
      } catch {
        MOCK_PLACES
          .filter(p => p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q))
          .slice(0, 4)
          .forEach(p => collected.push({
            id: p.id || p._id || '',
            type: 'place',
            title: p.name,
            subtitle: [p.city, p.categoryTags?.[0]].filter(Boolean).join(' · '),
            image: p.photos?.[0],
          }));
      }

      // ── Tours ────────────────────────────────────────────────
      try {
        const list = await tourAPI.getTours();
        const data = Array.isArray(list) ? list : [];
        const source = data.length > 0 ? data : MOCK_TOURS;
        source
          .filter((t: any) =>
            t.title?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q) ||
            t.departureLocation?.toLowerCase().includes(q)
          )
          .slice(0, 3)
          .forEach((t: any) => collected.push({
            id: t.id || t._id || '',
            type: 'tour',
            title: t.title,
            subtitle: [t.category, t.departureLocation].filter(Boolean).join(' · '),
            image: t.heroImage,
          }));
      } catch {
        MOCK_TOURS
          .filter(t => t.title?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q))
          .slice(0, 3)
          .forEach(t => collected.push({
            id: t.id || '',
            type: 'tour',
            title: t.title,
            subtitle: [t.category, t.departureLocation].filter(Boolean).join(' · '),
            image: t.heroImage,
          }));
      }

      // ── Rentals ──────────────────────────────────────────────
      try {
        const list = await rentalAPI.getRentals();
        const data = Array.isArray(list) ? list : [];
        const source = data.length > 0 ? data : MOCK_RENTALS;
        source
          .filter((r: any) =>
            r.title?.toLowerCase().includes(q) ||
            r.type?.toLowerCase().includes(q) ||
            r.locationName?.toLowerCase().includes(q)
          )
          .slice(0, 3)
          .forEach((r: any) => collected.push({
            id: r.id || r._id || '',
            type: 'rental',
            title: r.title,
            subtitle: [`${r.price} SAR`, r.type].filter(Boolean).join(' · '),
            image: (r.images && r.images[0]) || r.image,
          }));
      } catch {
        MOCK_RENTALS
          .filter(r => r.title?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q))
          .slice(0, 3)
          .forEach(r => collected.push({
            id: r.id || '',
            type: 'rental',
            title: r.title,
            subtitle: [`${r.price} SAR`, r.type].filter(Boolean).join(' · '),
            image: (r.images && r.images[0]) || r.image,
          }));
      }

      // ── Itineraries ──────────────────────────────────────────
      try {
        const list = await itineraryAPI.getItineraries({ limit: 50 });
        const data = Array.isArray(list) ? list : [];
        data
          .filter((i: any) =>
            i.title?.toLowerCase().includes(q) ||
            i.city?.toLowerCase().includes(q)
          )
          .slice(0, 3)
          .forEach((i: any) => collected.push({
            id: i.id || i._id || '',
            type: 'itinerary',
            title: i.title,
            subtitle: [i.city, `${i.places?.length ?? i.stops?.length ?? 0} stops`].filter(Boolean).join(' · '),
          }));
      } catch { /* no mock for itineraries */ }

      setResults(collected);
      setIsSearching(false);
    }, 280);
    return () => clearTimeout(timeout);
  }, [query]);

  const close = () => { setIsOpen(false); setQuery(''); setResults([]); };

  const handleSelect = (result: SearchResult) => {
    onNavigate(TYPE_TAB[result.type], result.id || undefined);
    close();
  };

  return (
    <>
      {/* Trigger button (shown in sidebar) */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 text-sm font-medium transition-colors"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span>Search places, tours, rentals…</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm flex flex-col items-center pt-14 px-4"
          onClick={close}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Input bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search places, tours, rentals, trips…"
                className="flex-1 outline-none text-slate-800 font-medium placeholder-slate-400 text-sm bg-transparent"
              />
              <button
                onClick={query ? () => setQuery('') : close}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results list */}
            <div className="max-h-[60vh] overflow-y-auto">
              {isSearching && (
                <div className="py-8 flex items-center justify-center gap-2 text-sm text-slate-400">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Searching…
                </div>
              )}

              {!isSearching && query.trim() && results.length === 0 && (
                <div className="py-12 text-center">
                  <Search className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-500 font-semibold text-sm">No results for "{query}"</p>
                  <p className="text-slate-400 text-xs mt-1">Try a different name or keyword</p>
                </div>
              )}

              {!isSearching && !query.trim() && (
                <div className="py-10 text-center">
                  <Compass className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                  <p className="text-slate-400 text-sm">Search for places, tours, rentals or trips</p>
                </div>
              )}

              {!isSearching && results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left border-b border-slate-50 last:border-0"
                >
                  {/* Thumbnail */}
                  {r.image ? (
                    <img
                      src={r.image}
                      className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
                      alt={r.title}
                    />
                  ) : (
                    <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {r.type === 'place'     && <MapPin   className="w-5 h-5 text-slate-400" />}
                      {r.type === 'tour'      && <Compass  className="w-5 h-5 text-slate-400" />}
                      {r.type === 'rental'    && <Tent     className="w-5 h-5 text-slate-400" />}
                      {r.type === 'itinerary' && <FileText className="w-5 h-5 text-slate-400" />}
                    </div>
                  )}

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate text-sm">{r.title}</p>
                    {r.subtitle && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{r.subtitle}</p>
                    )}
                  </div>

                  {/* Badge */}
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[r.type]}`}>
                    {TYPE_LABEL[r.type]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
