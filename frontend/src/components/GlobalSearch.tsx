import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  Search, X, MapPin, FileText, Tent, Compass, Clock, TrendingUp,
} from 'lucide-react';
import { searchAPI } from '../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SearchResult {
  id: string;
  type: 'place' | 'itinerary' | 'rental' | 'tour';
  title: string;
  subtitle?: string;
  image?: string;
}

// ── Static maps (module-level — zero cost, never recreated) ───────────────────
const TYPE_TAB: Record<SearchResult['type'], string> = {
  place: 'places',
  tour: 'tours',
  rental: 'rentals',
  itinerary: 'my_trips',
};

const TYPE_LABEL_EN: Record<SearchResult['type'], string> = {
  place: 'Place',
  tour: 'Tour',
  rental: 'Rental',
  itinerary: 'Trip',
};

const TYPE_LABEL_AR: Record<SearchResult['type'], string> = {
  place: 'مكان',
  tour: 'جولة',
  rental: 'إيجار',
  itinerary: 'رحلة',
};

const TYPE_BADGE: Record<SearchResult['type'], string> = {
  place: 'bg-teal-50   dark:bg-teal-900/40   text-teal-700   dark:text-teal-400',
  tour: 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
  rental: 'bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
  itinerary: 'bg-blue-50   dark:bg-blue-900/40   text-blue-700   dark:text-blue-400',
};

// FIX #12 — icon map replaces if-chain in JSX
const TYPE_ICON: Record<SearchResult['type'], React.ComponentType<{ className?: string }>> = {
  place: MapPin,
  tour: Compass,
  rental: Tent,
  itinerary: FileText,
};

const POPULAR_QUERIES_EN = [
  { label: 'Edge of the World', tab: 'places' },
  { label: 'Diriyah', tab: 'places' },
  { label: 'Heritage tours', tab: 'tours' },
  { label: 'Beach chalets', tab: 'rentals' },
  { label: 'Desert camps', tab: 'rentals' },
  { label: 'Riyadh hikes', tab: 'tours' },
];

const POPULAR_QUERIES_AR = [
  { label: 'حافة العالم', tab: 'places' },
  { label: 'الدرعية', tab: 'places' },
  { label: 'جولات تراثية', tab: 'tours' },
  { label: 'شاليهات بحرية', tab: 'rentals' },
  { label: 'مخيمات صحراوية', tab: 'rentals' },
  { label: 'مشي الرياض', tab: 'tours' },
];

// ── localStorage helpers ───────────────────────────────────────────────────────
const RECENT_KEY = 'tripo_recent_searches';

const loadRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
};

const persistRecent = (searches: string[]): void => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(searches)); }
  catch { /* storage full — ignore */ }
};

// Backend-powered search — no client-side cache needed
async function runSearch(query: string): Promise<SearchResult[]> {
  const raw = await searchAPI.search(query, undefined, 12);
  return raw.map(r => ({
    id: r._id,
    type: r.resultType as SearchResult['type'],
    title: r.title,
    subtitle: r.subtitle,
    image: r.image,
  }));
}

// ── ResultIcon — map-based (FIX #12) ──────────────────────────────────────────
const ResultIcon = React.memo(({ type }: { type: SearchResult['type'] }) => {
  const Icon = TYPE_ICON[type];
  return <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />;
});

// ── ResultRow — memoized sub-component (FIX #10, #13, #14) ───────────────────
// Defined OUTSIDE GlobalSearch so React never remounts it on parent re-render.
// Owns its own imgError state so broken images correctly fall back to the icon.
interface ResultRowProps {
  result: SearchResult;
  onSelect: (r: SearchResult) => void;
  lang?: 'en' | 'ar';
}

const ResultRow = React.memo(({ result, onSelect, lang = 'ar' }: ResultRowProps) => {
  const [imgError, setImgError] = useState(false);
  const TYPE_LABEL = lang === 'ar' ? TYPE_LABEL_AR : TYPE_LABEL_EN;

  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 active:bg-slate-100 dark:active:bg-white/10 transition-colors text-left border-b border-slate-50 dark:border-white/5 last:border-0"
      role="option"
      aria-selected="false"
    >
      {/* Thumbnail — FIX #13: onError fallback | FIX #14: loading="lazy" */}
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {result.image && !imgError ? (
          <img
            src={result.image}
            className="w-full h-full object-cover"
            alt={result.title}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <ResultIcon type={result.type} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">{result.title}</p>
        {result.subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{result.subtitle}</p>
        )}
      </div>

      {/* Badge */}
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_BADGE[result.type]}`}>
        {TYPE_LABEL[result.type]}
      </span>
    </button>
  );
});

// ── GlobalSearch ──────────────────────────────────────────────────────────────
export const GlobalSearch = ({
  onNavigate,
  inline = false,
  lang = 'ar',
}: {
  onNavigate: (tab: string, id?: string) => void;
  inline?: boolean;
  lang?: 'en' | 'ar';
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecent());

  const inputRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number>(0);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  // ── Open / Close ──────────────────────────────────────────────────────────

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  const open = useCallback(() => { setIsOpen(true); }, []);

  const handleTriggerPointerEnter = useCallback(() => {}, []);

  // Auto-focus when used inline (modal already open on mount)
  useEffect(() => {
    if (!inline) return;
    rafRef.current = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(rafRef.current);
  }, [inline]);

  // Focus when internal modal opens
  useEffect(() => {
    if (inline || !isOpen) return;
    rafRef.current = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen, inline]);

  // FIX #5 — Escape key dismisses modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  // ── Search — debounced call to backend ────────────────────────────────────
  useEffect(() => {
    if (!trimmedQuery || trimmedQuery.length < 2) { setResults([]); setIsSearching(false); return; }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await runSearch(trimmedQuery);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => { clearTimeout(timer); setIsSearching(false); };
  }, [trimmedQuery]);

  // ── Handlers (all stable useCallback — FIX #8) ───────────────────────────

  // FIX #6 — uses recentSearches state, not a fresh localStorage read
  const handleSelect = useCallback((result: SearchResult) => {
    if (trimmedQuery) {
      const updated = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 8);
      setRecentSearches(updated);
      persistRecent(updated);
    }
    onNavigate(TYPE_TAB[result.type], result.id || undefined);
    close();
  }, [trimmedQuery, recentSearches, onNavigate, close]);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch { /* ignore */ }
  }, []);

  const clearQuery = useCallback(() => setQuery(''), []);

  const handleRecentClick = useCallback((term: string) => {
    setQuery(term);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handlePopularClick = useCallback((label: string) => {
    setQuery(label);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const ar = lang === 'ar';
  const popularQueries = ar ? POPULAR_QUERIES_AR : POPULAR_QUERIES_EN;
  const placeholder = ar ? 'ابحث عن أماكن، جولات، إيجارات، رحلات…' : 'Search places, tours, rentals, trips…';

  // ── Shared input + results body ───────────────────────────────────────────
  const searchBody = (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-white/8">
        <Search className="w-5 h-5 text-slate-400 flex-shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-autocomplete="list"
          aria-controls="search-results-list"
          aria-label={placeholder}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="flex-1 outline-none text-slate-800 dark:text-slate-100 font-medium placeholder-slate-400 dark:placeholder-slate-500 text-sm bg-transparent"
        />
        {trimmedQuery && (
          <button
            onClick={clearQuery}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        id="search-results-list"
        className="max-h-[60vh] overflow-y-auto"
        role="listbox"
        aria-label="Search results"
      >
        {isSearching && (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" role="status" aria-label="Searching" />
            {ar ? 'جاري البحث…' : 'Searching…'}
          </div>
        )}

        {!isSearching && trimmedQuery && results.length === 0 && (
          <div className="py-12 text-center">
            <Search className="w-10 h-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" aria-hidden="true" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">{ar ? `لا نتائج لـ "${query}"` : `No results for "${query}"`}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{ar ? 'جرّب اسماً أو كلمة مختلفة' : 'Try a different name or keyword'}</p>
          </div>
        )}

        {!isSearching && !trimmedQuery && (
          <div className="py-4 px-4">
            {recentSearches.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-3 h-3" aria-hidden="true" /> {ar ? 'الأخيرة' : 'Recent'}
                  </p>
                  <button onClick={clearRecent} className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors font-bold" aria-label="Clear recent searches">
                    {ar ? 'مسح' : 'Clear'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map(s => (
                    <button key={s} onClick={() => handleRecentClick(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/12 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors active:scale-95">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" aria-hidden="true" /> {ar ? 'الأكثر بحثاً' : 'Popular'}
              </p>
              <div className="space-y-1">
                {popularQueries.map(p => (
                  <button key={p.label} onClick={() => handlePopularClick(p.label)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors active:bg-slate-100 dark:active:bg-white/10 text-left">
                    <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isSearching && results.map(r => (
          <ResultRow key={`${r.type}-${r.id}`} result={r} onSelect={handleSelect} lang={lang} />
        ))}
      </div>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  // Inline mode: render input+results directly (no trigger, no second modal)
  if (inline) {
    return <div role="search" aria-label="Search Tripo">{searchBody}</div>;
  }

  // Standalone mode: trigger button + own modal
  return (
    <>
      <button
        onClick={open}
        onPointerEnter={handleTriggerPointerEnter}
        onFocus={handleTriggerPointerEnter}
        className="flex items-center gap-2 w-full px-3 py-2.5 bg-slate-100 dark:bg-white/8 hover:bg-slate-200 dark:hover:bg-white/12 rounded-xl text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors"
        aria-label="Open search"
        aria-haspopup="dialog"
      >
        <Search className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{ar ? 'ابحث عن أماكن، جولات، إيجارات…' : 'Search places, tours, rentals…'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-sm flex flex-col items-center pt-14 px-4" onClick={close}>
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-white/8"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search Tripo"
          >
            {searchBody}
          </div>
        </div>
      )}
    </>
  );
};