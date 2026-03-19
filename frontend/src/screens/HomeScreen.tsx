import React, { useState, useEffect } from 'react';
import { Star, Clock, Wallet, MapPin, Camera, RefreshCw, Search } from 'lucide-react';
import { User, Itinerary, Place } from '../types/index';
import { itineraryAPI, placeAPI } from '../services/api';
import { PlaceDetailModal } from '../components/PlaceDetailModal';

export const HomeScreen = ({ user, onOpenItinerary, t, onOpenAR }: { user: User, onOpenItinerary: (i: Itinerary) => void, t: any, onOpenAR: () => void }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [feedData, placesData] = await Promise.all([
          itineraryAPI.getFeed(),
          placeAPI.getPlaces()
        ]);

        setItineraries(Array.isArray(feedData) ? feedData : []);
        setPlaces(Array.isArray(placesData?.data) ? placesData.data : []);

      } catch (err: any) {
        setError(t.genericError || 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredItineraries = itineraries;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-gray-200 border-t-black rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <RefreshCw />
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">

      {/* Airbnb Style Top Bar */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <h1 className="font-bold text-xl">Explore</h1>

          <div className="flex items-center gap-3 border rounded-full px-4 py-2 shadow-sm hover:shadow-md transition cursor-pointer">
            <Search className="w-4 h-4" />
            <span className="text-sm text-gray-500">Where to?</span>
          </div>

          <button onClick={onOpenAR} className="p-2 rounded-full hover:bg-gray-100">
            <Camera />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-12">

        {/* Places (Airbnb Cards) */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Popular places</h2>
          <div className="grid grid-cols-4 gap-6">
            {places.map(place => (
              <div key={place._id || place.id} onClick={() => setSelectedPlace(place)} className="cursor-pointer group">
                <div className="rounded-2xl overflow-hidden mb-2">
                  <img src={place.photos?.[0] || place.image} className="w-full h-60 object-cover group-hover:scale-105 transition" />
                </div>
                <div className="flex justify-between">
                  <h3 className="font-semibold text-sm">{place.name}</h3>
                  <span className="flex items-center text-sm"><Star className="w-3 h-3 fill-black" /> {place.ratingSummary?.avgRating || 4.5}</span>
                </div>
                <p className="text-xs text-gray-500">{place.category}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Itineraries (Meetup Style Cards) */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Experiences</h2>

          <div className="grid grid-cols-3 gap-6">
            {filteredItineraries.map(it => (
              <div key={it._id || it.id} onClick={() => onOpenItinerary(it)} className="border rounded-2xl overflow-hidden hover:shadow-lg transition cursor-pointer">

                <img src={it.places?.[0]?.image} className="w-full h-48 object-cover" />

                <div className="p-4 space-y-3">
                  <h3 className="font-bold">{it.title}</h3>

                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {Math.floor(it.estimatedDuration / 60)}h
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <Wallet className="w-4 h-4" />
                    {it.estimatedCost} SAR
                  </div>

                  <button className="w-full mt-2 bg-black text-white py-2 rounded-xl hover:opacity-90">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedPlace && (
        <PlaceDetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)} t={t} />
      )}
    </div>
  );
};