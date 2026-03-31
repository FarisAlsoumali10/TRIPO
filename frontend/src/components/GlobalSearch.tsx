import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, FileText, Tent } from 'lucide-react';
import { placeAPI, itineraryAPI, rentalAPI } from '../services/api';

interface SearchResult {
  id: string;
  type: 'place' | 'itinerary' | 'rental';
  title: string;
  subtitle?: string;
  image?: string;
}

const TYPE_TAB: Record<SearchResult['type'], string> = {
  place: 'explore',
  itinerary: 'home',
  rental: 'rentals',
};

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  place: 'Place',
  itinerary: 'Trip',  // already correct
  rental: 'Rental',
};

const TYPE_BADGE: Record<SearchResult['type'], string> = {
  place: 'bg-slate-100 text-slate-600',
  itinerary: 'bg-blue-50 text-blue-600',
  rental: 'bg-orange-50 text-orange-600',
};

export const GlobalSearch = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
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
      try {
        const [placesResult, itinsResult, rentalsResult] = await Promise.allSettled([
          placeAPI.getPlaces(),
          itineraryAPI.getItineraries({ limit: 50 }),
          rentalAPI.getRentals(),
        ]);
        const q = query.toLowerCase();
        const collected: SearchResult[] = [];

        if (placesResult.status === 'fulfilled') {
          placesResult.value
            .filter((p: any) => p.name?.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach((p: any) => collected.push({
              id: p.id || p._id,
              type: 'place',
              title: p.name,
              subtitle: p.categoryTags?.[0] || 'Place',
              image: p.photos?.[0] || p.image,
            }));
        }

        if (itinsResult.status === 'fulfilled') {
          itinsResult.value
            .filter((i: any) => i.title?.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach((i: any) => collected.push({
              id: i.id || i._id,
              type: 'itinerary',
              title: i.title,
              subtitle: `${i.places?.length ?? 0} stops`,
            }));
        }

        if (rentalsResult.status === 'fulfilled') {
          rentalsResult.value
            .filter((r: any) => r.title?.toLowerCase().includes(q))
            .slice(0, 3)
            .forEach((r: any) => collected.push({
              id: r.id || r._id,
              type: 'rental',
              title: r.title,
              subtitle: `${r.price} SAR · ${r.type}`,
              image: r.image,
            }));
        }

        setResults(collected);
      } catch {
        setResults([]);
      }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const close = () => { setIsOpen(false); setQuery(''); setResults([]); };

  const handleSelect = (result: SearchResult) => {
    onNavigate(TYPE_TAB[result.type]);
    close();
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 text-sm font-medium transition-colors"
      >
        <Search className="w-4 h-4 flex-shrink-0" />
        <span>Search...</span>
        <kbd className="ml-auto text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono hidden lg:block">/</kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/50 flex flex-col items-center pt-16 px-4" onClick={close}>
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
                placeholder="Search places, trips, rentals..."
                className="flex-1 outline-none text-slate-800 font-medium placeholder-slate-400 text-sm"
              />
              {query ? (
                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={close} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {isSearching && (
                <div className="py-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  Searching...
                </div>
              )}

              {!isSearching && query && results.length === 0 && (
                <div className="py-10 text-center text-sm text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No results for "<span className="font-semibold">{query}</span>"
                </div>
              )}

              {!isSearching && !query && (
                <div className="py-10 text-center text-sm text-slate-400">
                  Type to search places, trips, and rentals
                </div>
              )}

              {!isSearching && results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                >
                  {r.image ? (
                    <img src={r.image} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt={r.title} />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {r.type === 'place' && <MapPin className="w-4 h-4 text-slate-400" />}
                      {r.type === 'itinerary' && <FileText className="w-4 h-4 text-slate-400" />}
                      {r.type === 'rental' && <Tent className="w-4 h-4 text-slate-400" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate text-sm">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.subtitle}</p>
                  </div>
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
