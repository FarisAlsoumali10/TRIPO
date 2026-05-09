import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// ─── Custom emerald marker ────────────────────────────────────────────────────
const createCustomIcon = (category: string) => {
  const emoji: Record<string, string> = {
    Heritage:    '🏛️',
    Nature:      '🌿',
    Landmark:    '🗼',
    Cultural:    '🎭',
    Adventure:   '🧗',
    default:     '📍',
  };
  const icon = emoji[category] ?? emoji.default;

  return L.divIcon({
    className: '',
    html: `
      <div style="
        background: #10b981;
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        width: 36px; height: 36px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 16px;">${icon}</span>
      </div>`,
    iconSize:   [36, 36],
    iconAnchor: [18, 36],
    popupAnchor:[0, -38],
  });
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface MapPlace {
  id: string;
  _id?: string;
  name: string;
  nameAr?: string;
  city: string;
  cityAr?: string;
  category: string;
  ratingSummary?: { avgRating: number; reviewCount: number };
  image?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

interface TripMapProps {
  places: MapPlace[];
  selectedId?: string;
  onSelectPlace?: (place: MapPlace) => void;
  lang?: 'en' | 'ar';
  height?: string;
  centerOnSelected?: boolean;
}

// ─── Helper: fly to selected marker ──────────────────────────────────────────
function FlyToSelected({ place }: { place: MapPlace | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!place) return;
    const [lng, lat] = place.location.coordinates;
    map.flyTo([lat, lng], 13, { duration: 1.2 });
  }, [place, map]);
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const TripMap: React.FC<TripMapProps> = ({
  places,
  selectedId,
  onSelectPlace,
  lang = 'en',
  height = '400px',
  centerOnSelected = true,
}) => {
  const isRTL = lang === 'ar';

  // Default center: Saudi Arabia
  const defaultCenter: [number, number] = [24.7136, 46.6753];
  const defaultZoom = 5;

  const selectedPlace = places.find(p => (p.id || p._id) === selectedId);

  return (
    <div style={{ height, width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        preferCanvas={true} // Better performance per Leaflet best practices
      >
        {/* Tile layer — CartoDB Voyager (clean, no API key needed) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Fly to selected */}
        {centerOnSelected && (
          <FlyToSelected place={selectedPlace} />
        )}

        {/* Place markers */}
        {places.map(place => {
          const [lng, lat] = place.location.coordinates;
          const isSelected = (place.id || place._id) === selectedId;
          return (
            <Marker
              key={place.id || place._id}
              position={[lat, lng]}
              icon={createCustomIcon(place.category || 'default')}
              eventHandlers={{ click: () => onSelectPlace?.(place) }}
              zIndexOffset={isSelected ? 1000 : 0}
            >
              <Popup minWidth={200}>
                <div style={{ fontFamily: 'sans-serif', direction: isRTL ? 'rtl' : 'ltr' }}>
                  {place.image && (
                    <img
                      src={place.image}
                      alt={isRTL ? place.nameAr ?? place.name : place.name}
                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                      loading="lazy"
                    />
                  )}
                  <strong style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                    {isRTL ? place.nameAr ?? place.name : place.name}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    📍 {isRTL && place.cityAr ? place.cityAr : place.city}
                  </span>
                  {place.ratingSummary && (
                    <span style={{ fontSize: '12px', color: '#f59e0b', marginLeft: '8px' }}>
                      ★ {place.ratingSummary.avgRating.toFixed(1)}
                    </span>
                  )}
                  {onSelectPlace && (
                    <button
                      onClick={() => onSelectPlace(place)}
                      style={{
                        display: 'block', width: '100%', marginTop: '8px',
                        background: '#10b981', color: 'white', border: 'none',
                        borderRadius: '8px', padding: '6px', fontSize: '12px',
                        fontWeight: 'bold', cursor: 'pointer',
                      }}
                    >
                      {isRTL ? 'عرض التفاصيل' : 'View Details'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TripMap;
