import React, { useState, useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { Place } from '../types/index';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { placeAPI } from '../services/api';
import { showToast } from '../components/Toast';
import { MOCK_PLACES } from './HomeScreen';

const CATEGORY_FILTER_KEYS = [
  { id: '', tKey: 'mapCatAll' },
  { id: 'Food', tKey: 'mapCatFood' },
  { id: 'Nature', tKey: 'mapCatNature' },
  { id: 'Sports', tKey: 'mapCatSports' },
  { id: 'Culture', tKey: 'mapCatCulture' },
  { id: 'Shopping', tKey: 'mapCatShopping' },
];

export const ExploreScreen = ({ t, onOpenPlace }: { t: any, onOpenPlace: (p: Place) => void }) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Place | null>(null);
  const [mapCategory, setMapCategory] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const placesData = await placeAPI.getPlaces();
        const formatted = Array.isArray(placesData) ? placesData : (placesData?.data || placesData?.places || []);
        setPlaces(formatted.length > 0 ? formatted : MOCK_PLACES);
      } catch {
        setPlaces(MOCK_PLACES);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || isLoading) return;

    const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
      .setView([24.7136, 46.6753], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    markersLayerRef.current = layer;
    mapInstanceRef.current = map;
  }, [isLoading]);

  // Update place markers when category filter changes
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    const filteredPlaces = mapCategory
      ? places.filter(p => (p.categoryTags?.[0] || p.category || '').toLowerCase().includes(mapCategory.toLowerCase()))
      : places;

    filteredPlaces.forEach(p => {
      const lat = p.coordinates?.lat || p.lat || 24.7136;
      const lng = p.coordinates?.lng || p.lng || 46.6753;
      const marker = L.circleMarker([lat, lng], { radius: 8, fillColor: '#0f172a', color: '#fff', weight: 2, opacity: 1, fillOpacity: 1 });
      marker.addTo(markersLayerRef.current!);
      marker.bindTooltip(p.name || 'Place', { direction: 'top', offset: [0, -10] });
      marker.on('click', () => setSelectedItem(p));
    });
  }, [mapCategory, places]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 14);
          // Add a blue dot for user location
          L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
            radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1,
          }).addTo(mapInstanceRef.current).bindTooltip('You are here', { permanent: false });
        }
      },
      () => {
        setIsLocating(false);
        showToast('Could not get your location. Please check browser permissions.', 'error');
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-100">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Category filter pills */}
        <div className="absolute top-4 left-0 w-full z-10 px-4 pointer-events-none">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pointer-events-auto pb-1">
            {CATEGORY_FILTER_KEYS.map(f => (
              <button
                key={f.id}
                onClick={() => setMapCategory(f.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shadow-sm ${mapCategory === f.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white/90 text-slate-700 border-slate-200 hover:border-emerald-400'}`}
              >
                {(t as any)[f.tKey] || f.tKey}
              </button>
            ))}
          </div>
        </div>

        {/* Near Me button */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleNearMe}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm hover:bg-white hover:border-emerald-400 transition-all disabled:opacity-60"
          >
            {isLocating ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            )}
            {isLocating ? ((t as any).mapLocating || 'Locating...') : ((t as any).mapNearMe || 'Near Me')}
          </button>
        </div>

        <div ref={mapContainerRef} className="w-full h-full outline-none" />
        <div className="absolute bottom-20 left-0 w-full text-center pointer-events-none z-[400]">
          <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-md border border-slate-100">{t.mapHint || 'Tap a pin to explore'}</span>
        </div>
      </div>

      {selectedItem && (
        <PlaceDetailModal place={selectedItem} onClose={() => setSelectedItem(null)} t={t} />
      )}
    </div>
  );
};
