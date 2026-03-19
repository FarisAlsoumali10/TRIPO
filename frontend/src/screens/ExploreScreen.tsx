import React, { useState, useEffect, useRef } from 'react';
import { Map as MapIcon, Tent, Home, Plus, X, Star, MapPin, Flame } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { Rental, Place } from '../types/index';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // تأكد من استيراد CSS الخاص بالخريطة
import { PlaceDetailModal } from '../components/PlaceDetailModal';
import { placeAPI } from '../services/api'; // استيراد الـ API الحقيقي

export const ExploreScreen = ({ t, onOpenPlace }: { t: any, onOpenPlace: (p: Place) => void }) => {
  const [viewMode, setViewMode] = useState<'map' | 'rentals'>('map');
  const [showHostModal, setShowHostModal] = useState(false);

  // States للبيانات الحقيقية
  const [places, setPlaces] = useState<Place[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]); // مبدئياً فارغة أو نملأها محلياً حتى نربطها بالـ API
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Place | Rental | null>(null);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // 1. جلب البيانات الحقيقية من الباك-إند
  useEffect(() => {
    const fetchExploreData = async () => {
      try {
        setIsLoading(true);
        const placesData = await placeAPI.getPlaces();
        // التأكد من استخراج المصفوفة الصحيحة من الـ API
        const formattedPlaces = Array.isArray(placesData) ? placesData : (placesData.data || placesData.places || []);
        setPlaces(formattedPlaces);
      } catch (error) {
        console.error('Failed to fetch places for map:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExploreData();
  }, []);

  // 2. تهيئة الخريطة (تعمل فقط بعد تحميل البيانات وعندما نكون في وضع الخريطة)
  useEffect(() => {
    if (viewMode === 'map' && mapContainerRef.current && !mapInstanceRef.current && !isLoading) {
      // إنشاء الخريطة
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([24.7136, 46.6753], 12); // مركز مدينة الرياض

      // إضافة طبقة الخريطة
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      // إضافة علامات الأماكن الحقيقية (Places Markers)
      places.forEach(p => {
        // إذا كان المكان لا يحتوي على إحداثيات، نتخطاه أو نضع إحداثيات افتراضية
        const lat = p.coordinates?.lat || p.lat || 24.7136;
        const lng = p.coordinates?.lng || p.lng || 46.6753;

        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: '#0f172a', // slate-900
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);

        marker.bindTooltip(p.name || 'موقع', { direction: 'top', offset: [0, -10], permanent: false });
        marker.on('click', () => setSelectedItem(p));
      });

      // إضافة علامات الإيجارات (Rentals Markers)
      rentals.forEach(r => {
        const lat = r.lat || 24.8 + Math.random() * 0.1;
        const lng = r.lng || 46.6 + Math.random() * 0.1;
        const color = r.type === 'Kashta' ? '#ea580c' : '#059669';

        const marker = L.circleMarker([lat, lng], {
          radius: r.type === 'Kashta' ? 12 : 10,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);

        marker.bindTooltip(`${r.price} SAR`, { direction: 'top', className: r.type === 'Kashta' ? 'font-bold text-orange-600' : 'font-bold text-emerald-700', permanent: true, offset: [0, -10] });
        marker.on('click', () => setSelectedItem(r));
      });

      mapInstanceRef.current = map;
    }

    // تنظيف الخريطة عند الخروج منها
    return () => {
      if (viewMode !== 'map' && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [viewMode, places, rentals, isLoading]);


  // Host Form State
  const [newRental, setNewRental] = useState<Partial<Rental>>({
    title: '',
    price: 0,
    locationName: '',
    type: 'Camp'
  });

  const handleHostSubmit = () => {
    if (!newRental.title || !newRental.price) return;
    const rental: Rental = {
      id: Date.now().toString(),
      title: newRental.title!,
      price: Number(newRental.price),
      locationName: newRental.locationName || 'Riyadh',
      type: newRental.type as any,
      image: 'https://images.unsplash.com/photo-1496080174650-637e3f22fa03?w=400&q=80',
      rating: 5.0,
      x: 50, y: 50, lat: 24.75, lng: 46.7,
      ownerId: 'me',
      description: 'New listing'
    };
    setRentals([rental, ...rentals]);
    setShowHostModal(false);
    setViewMode('rentals');
  };

  // تصنيف الإيجارات للعرض
  const kashtas = rentals.filter(r => r.type === 'Kashta');
  const otherRentals = rentals.filter(r => r.type !== 'Kashta');

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">
      {/* Top Toggle */}
      <div className="absolute top-4 left-0 w-full z-10 px-4 flex justify-between items-start pointer-events-none">
        <div className="bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-lg border border-slate-100 flex pointer-events-auto">
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'map' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <MapIcon className="w-4 h-4" /> {t.exploreMap || 'Map'}
          </button>
          <button
            onClick={() => setViewMode('rentals')}
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'rentals' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Tent className="w-4 h-4" /> {t.exploreRentals || 'Rentals'}
          </button>
        </div>
      </div>

      {viewMode === 'map' && (
        <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-100">
          {/* مؤشر التحميل أثناء جلب الأماكن */}
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <div ref={mapContainerRef} className="w-full h-full outline-none" />

          <div className="absolute bottom-20 left-0 w-full text-center pointer-events-none z-[400]">
            <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 shadow-md border border-slate-100">{t.mapHint || 'Tap a pin to explore'}</span>
          </div>
        </div>
      )}

      {viewMode === 'rentals' && (
        <div className="flex-1 overflow-y-auto p-4 pt-16">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{t.exploreRentals || 'Rentals'}</h2>
              <p className="text-slate-500 text-sm">{t.rentalsDesc || 'Find camps, chalets, and local stays.'}</p>
            </div>
            <button onClick={() => setShowHostModal(true)} className="flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100">
              <Plus className="w-4 h-4" /> {t.hostPlace || 'Host'}
            </button>
          </div>

          {rentals.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
              <Tent className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <h3 className="text-slate-500 font-bold">{t.noRentals || 'No rentals available yet.'}</h3>
              <p className="text-sm text-slate-400 mt-1">{t.beFirstHost || 'Be the first to host a place!'}</p>
            </div>
          ) : (
            <>
              {/* Featured Kashtas Section */}
              {kashtas.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-none">{t.kashtaSection || 'Top Kashtas'}</h3>
                      <p className="text-[10px] text-slate-500">{t.kashtaDesc || 'Best desert experiences'}</p>
                    </div>
                  </div>

                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
                    {kashtas.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="min-w-[240px] w-[240px] bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 snap-start cursor-pointer group active:scale-95 transition-transform"
                      >
                        <div className="h-32 w-full relative">
                          <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-3 left-3 text-white rtl:right-3 rtl:left-auto">
                            <p className="font-bold text-sm">{item.title}</p>
                            <p className="text-[10px] opacity-90">{item.locationName}</p>
                          </div>
                          <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm rtl:left-2 rtl:right-auto">
                            {item.rating} ★
                          </div>
                        </div>
                        <div className="p-3 flex justify-between items-center">
                          <p className="text-[10px] text-slate-500 line-clamp-1 w-2/3">{item.description}</p>
                          <p className="font-bold text-orange-600 whitespace-nowrap">{item.price} <span className="text-[10px]">SAR</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Rentals Section */}
              {otherRentals.length > 0 && (
                <>
                  <h3 className="font-bold text-slate-900 mb-3">{t.otherStays || 'Other Stays'}</h3>
                  <div className="space-y-4">
                    {otherRentals.map(item => (
                      <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col cursor-pointer active:scale-98 transition-transform">
                        <div className="relative h-40 rounded-xl overflow-hidden mb-3">
                          <img src={item.image} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 rtl:left-2 rtl:right-auto">
                            <Star className="w-3 h-3 text-orange-400 fill-orange-400" /> {item.rating}
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-bold rtl:right-2 rtl:left-auto">
                            {item.type === 'Camp' ? (t.camp || 'Camp') : item.type === 'Chalet' ? (t.chalet || 'Chalet') : (t.apartment || 'Apartment')}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                            <MapPin className="w-3 h-3" /> {item.locationName}
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                            <p className="font-bold text-lg text-emerald-700">{item.price} <span className="text-xs font-normal text-slate-500">SAR {t.perNight || '/ night'}</span></p>
                            <Button className="px-4 py-2 text-xs" onClick={(e: any) => { e.stopPropagation(); /* Booking logic */ }}>{t.bookNow || 'Book Now'}</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Host Modal */}
      {showHostModal && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{t.hostTitle || 'Host a Place'}</h3>
              <button onClick={() => setShowHostModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <Input label="Title" placeholder="e.g. Cozy Desert Tent" value={newRental.title} onChange={(e: any) => setNewRental({ ...newRental, title: e.target.value })} />
              <Input label={t.locationLabel || 'Location'} placeholder="e.g. Thumamah" value={newRental.locationName} onChange={(e: any) => setNewRental({ ...newRental, locationName: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label={t.priceLabel || 'Price (SAR)'} type="number" placeholder="400" value={newRental.price} onChange={(e: any) => setNewRental({ ...newRental, price: e.target.value })} />
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200"
                    value={newRental.type}
                    onChange={(e) => setNewRental({ ...newRental, type: e.target.value as any })}
                  >
                    <option value="Kashta">{t.kashta || 'Kashta'}</option>
                    <option value="Camp">{t.camp || 'Camp'}</option>
                    <option value="Chalet">{t.chalet || 'Chalet'}</option>
                    <option value="Apartment">{t.apartment || 'Apartment'}</option>
                  </select>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={handleHostSubmit}>{t.submitRental || 'Submit Listing'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Place Detail Modal */}
      {selectedItem && (
        <PlaceDetailModal place={selectedItem} onClose={() => setSelectedItem(null)} t={t} />
      )}
    </div>
  );
};