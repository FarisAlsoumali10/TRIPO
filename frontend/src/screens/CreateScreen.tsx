import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, ChevronLeft, Search } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { Place, Itinerary } from '../types/index';
import { placeAPI } from '../services/api'; // 🔴 استيراد الـ API الحقيقي

export const CreateScreen = ({ onSave, t }: { onSave: (it: Partial<Itinerary>) => void, t: any }) => {
  const [title, setTitle] = useState('');
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // States للبيانات الحقيقية
  const [availablePlaces, setAvailablePlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // جلب الأماكن من الباك-إند عند فتح نافذة البحث
  useEffect(() => {
    if (isSearchOpen && availablePlaces.length === 0) {
      const fetchPlaces = async () => {
        try {
          setIsLoading(true);
          const placesData = await placeAPI.getPlaces();
          const formattedPlaces = Array.isArray(placesData) ? placesData : (placesData.data || placesData.places || []);
          setAvailablePlaces(formattedPlaces);
        } catch (error) {
          console.error('Failed to fetch places:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPlaces();
    }
  }, [isSearchOpen, availablePlaces.length]);

  const handleAddPlace = (p: Place) => {
    // منع إضافة نفس المكان مرتين
    if (!selectedPlaces.find(place => (place._id || place.id) === (p._id || p.id))) {
      setSelectedPlaces([...selectedPlaces, p]);
    }
    setIsSearchOpen(false);
    setSearchQuery(''); // تصفير البحث
  };

  const handleRemovePlace = (indexToRemove: number) => {
    setSelectedPlaces(selectedPlaces.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCreate = () => {
    if (!title || selectedPlaces.length === 0) return;
    onSave({
      title,
      // تمرير الـ ID فقط أو الـ Object حسب ما يتوقعه الباك-إند (سنمرر الـ Object هنا كمرجع)
      places: selectedPlaces.map((p, index) => ({ placeId: p._id || p.id || '', order: index + 1 })),
      // حساب التكلفة والوقت (باستخدام البيانات الحقيقية أو الافتراضية إذا لم تكن موجودة)
      estimatedCost: selectedPlaces.reduce((acc, p) => acc + (p.avgCost || 0), 0),
      estimatedDuration: selectedPlaces.reduce((acc, p) => acc + (p.duration || 60), 0), // افتراض 60 دقيقة لكل مكان
    });
  };

  // تصفية الأماكن بناءً على البحث
  const filteredPlaces = availablePlaces.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoryTags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
        <h1 className="text-lg font-bold text-slate-900">{t.newItinerary || 'Create Itinerary'}</h1>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <Input
          label={t.tripTitle || 'Trip Title'}
          placeholder={t.tripTitlePlaceholder || 'e.g., Weekend Getaway in Riyadh'}
          value={title}
          onChange={(e: any) => setTitle(e.target.value)}
        />

        <div className="mt-8">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{t.stopsLabel || 'Itinerary Stops'}</label>

          <div className="space-y-3">
            {selectedPlaces.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-sm text-slate-400 font-medium">{t.noPlacesYet || 'No places added yet. Add your first stop!'}</p>
              </div>
            ) : (
              selectedPlaces.map((p, i) => (
                <div key={p._id || p.id || i} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {p.categoryTags?.[0] || p.category || 'Place'} • {p.duration || 60} min
                    </p>
                  </div>
                  <button onClick={() => handleRemovePlace(i)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}

            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full mt-4 py-4 border-2 border-dashed border-slate-300 bg-white rounded-2xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            >
              <Plus className="w-5 h-5" /> {t.addPlace || 'Add Place'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between text-sm mb-4 text-slate-600 font-medium bg-slate-50 p-3 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.totalCost || 'Est. Cost'}</span>
            <span className="font-bold text-slate-900">{selectedPlaces.reduce((a, b) => a + (b.avgCost || 0), 0)} SAR</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.time || 'Duration'}</span>
            <span className="font-bold text-slate-900">{selectedPlaces.reduce((a, b) => a + (b.duration || 60), 0)} min</span>
          </div>
        </div>
        <Button className="w-full py-4 text-lg shadow-emerald-500/20 shadow-lg" onClick={handleCreate} disabled={!title || selectedPlaces.length === 0}>
          {t.publishBtn || 'Publish Itinerary'}
        </Button>
      </div>

      {/* Search Modal Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b border-slate-100 flex gap-3 items-center bg-white shadow-sm">
            <button onClick={() => setIsSearchOpen(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-6 h-6 text-slate-600 rtl:rotate-180" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:right-3 rtl:left-auto" />
              <input
                autoFocus
                placeholder={t.searchPlaceholder || 'Search for a place...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 pl-10 pr-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm rtl:pl-4 rtl:pr-10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500 font-medium">Loading places...</p>
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="text-center py-10 text-slate-500 font-medium">
                {searchQuery ? 'No places found matching your search.' : 'No places available.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlaces.map(p => (
                  <div
                    key={p._id || p.id}
                    onClick={() => handleAddPlace(p)}
                    className="flex items-center gap-4 p-3 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 rounded-2xl cursor-pointer transition-all active:scale-98 shadow-sm group"
                  >
                    <img
                      src={p.photos?.[0] || p.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=200&q=80'}
                      className="w-16 h-16 rounded-xl object-cover"
                      alt={p.name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{p.categoryTags?.[0] || p.category || 'Place'}</span>
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};