import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Ticket } from 'lucide-react';
import { eventAPI } from '../services/api'; // Import the new API
import { CommunityEvent } from '../types/index';

export const EventsScreen = () => {
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
          <p className="text-sm font-bold text-slate-500 animate-pulse">Loading amazing events...</p>
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
        <h3 className="font-bold text-lg text-slate-600">No Events Found</h3>
        <p className="text-sm mt-1">Looks like there are no upcoming events. Check back later!</p>
      </div>
    );
  }

  // 6. Render Real Data
  return (
    <div className="p-4 space-y-4 pb-24 bg-slate-50 h-full overflow-y-auto">
      <h2 className="text-2xl font-black text-slate-900 mb-6">Upcoming Events</h2>
      
      {events.map((event) => (
        <div key={event.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100">
          <div className="h-40 relative">
            <img src={event.image || 'https://placehold.co/600x400?text=Event'} className="w-full h-full object-cover" alt={event.title} />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {event.fee ? (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-yellow-400 flex items-center gap-1">
                <Ticket className="w-3 h-3" /> {event.fee} SAR
              </div>
            ) : (
              <div className="absolute bottom-3 right-3 bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Free
              </div>
            )}
          </div>
          
          <div className="p-5">
            <h3 className="text-lg font-black text-slate-900 mb-1">{event.title}</h3>
            {event.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{event.description}</p>}
            
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 mt-2">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.locationName}</span>
              {event.attendeesCount !== undefined && (
                 <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {event.attendeesCount} going</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
