import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { eventAPI } from '../services/api'; // Import the new API
import { CommunityEvent } from '../types/index';

export const EventsScreen = ({ lang, t, onCreateWithEvent, initialEventId, onEventOpened }: { lang?: 'en' | 'ar'; t?: any; onCreateWithEvent?: (title: string) => void; initialEventId?: string; onEventOpened?: () => void }) => {
  const ar = lang === 'ar';
  // 1. Initialize empty state instead of Mock Arrays
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. The Anti-Gravity Fetch Engine
  useEffect(() => {
    const fetchRealEvents = async () => {
      try {
        setIsLoading(true);
        const realEvents = await eventAPI.getEvents();
        setEvents(realEvents);
      } catch (err) {
        console.error("Failed to load events", err);
        setError("Could not load events. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRealEvents();
  }, []);

  // 3. Loading State
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-500 animate-pulse">{ar ? 'جارٍ تحميل الفعاليات...' : 'Loading amazing events...'}</p>
        </div>
      </div>
    );
  }

  // 4. Error State
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-red-500 font-bold">
        {error}
      </div>
    );
  }

  // 5. Empty State (If DB is empty)
  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center text-slate-400">
        <Calendar className="w-12 h-12 mb-3 opacity-20" />
        <h3 className="font-bold text-lg text-slate-600">{ar ? 'لا توجد فعاليات' : 'No Events Found'}</h3>
        <p className="text-sm mt-1">{ar ? 'لا توجد فعاليات قادمة حالياً. تفقد لاحقاً!' : 'Looks like there are no upcoming events. Check back later!'}</p>
      </div>
    );
  }

  // 6. Render Real Data
  return (
    <div className="p-4 space-y-4 pb-24 bg-slate-50 h-full overflow-y-auto">
      {/* CTA Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full" />
        <div className="relative p-5">
          <p className="text-purple-200 text-xs font-bold uppercase tracking-widest mb-1">{ar ? 'ما يحدث بالقرب منك' : "What's happening near you"}</p>
          <h2 className="text-xl font-black text-white mb-1 leading-tight">{ar ? 'اكتشف الفعاليات والتجارب' : 'Discover Events & Experiences'}</h2>
          <p className="text-purple-200 text-xs mb-4">{ar ? 'من جولات التراث إلى مهرجانات الطعام — اعثر على لحظتك القادمة.' : 'From heritage walks to food festivals — find your next unforgettable moment.'}</p>
          <div className="flex gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'explore' }))}
              className="px-4 py-2 bg-white text-purple-700 font-black text-xs rounded-2xl active:scale-95 transition-transform shadow-md"
            >
              {ar ? 'استكشف على الخريطة ←' : 'Explore on Map →'}
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('tripo:navigate', { detail: 'create' }))}
              className="px-4 py-2 bg-white/20 text-white font-black text-xs rounded-2xl active:scale-95 transition-transform border border-white/30"
            >
              {ar ? '+ خطط لرحلة' : '+ Plan a Trip'}
            </button>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black text-slate-900 mb-6">{ar ? 'الفعاليات القادمة' : 'Upcoming Events'}</h2>

      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
          <div className="h-40 relative">
            <img src={event.image || 'https://placehold.co/600x400?text=Event'} className="w-full h-full object-cover" alt={event.title} />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(event.date).toLocaleDateString(ar ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
            </div>
            {event.fee ? (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-yellow-400 flex items-center gap-1">
                <Ticket className="w-3 h-3" /> {event.fee} SAR
              </div>
            ) : (
              <div className="absolute bottom-3 right-3 bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                <Ticket className="w-3 h-3" /> {ar ? 'مجاني' : 'Free'}
              </div>
            )}
          </div>
          
          <div className="p-5">
            <h3 className="text-lg font-black text-slate-900 mb-1">{event.title}</h3>
            {event.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{event.description}</p>}
            
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mt-2">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.locationName}</span>
              {event.attendeesCount !== undefined && (
                 <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {event.attendeesCount} {ar ? 'حاضر' : 'going'}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
