import React from 'react';
import { ChevronLeft, Heart, Clock, Wallet, Users } from 'lucide-react';
import { Button, Badge } from '../components/ui';
import { Itinerary } from '../types/index';

export const ItineraryDetailScreen = ({ itinerary, onBack, onStartGroup, t }: { itinerary: Itinerary, onBack: () => void, onStartGroup: () => void, t: any }) => {
   return (
      <div className="h-full flex flex-col bg-white overflow-y-auto pb-24 relative">
         <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
            <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
               <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
            </button>
            <div className="flex gap-2">
               <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Heart className="w-5 h-5" />
               </button>
            </div>
         </div>

         <div className="h-64 w-full shrink-0 relative">
            <img src={itinerary.places[0].image} className="w-full h-full object-cover" />
         </div>

         <div className="px-5 py-6 -mt-6 bg-white rounded-t-3xl relative z-0 flex-1">
            <div className="flex items-start justify-between mb-2">
               <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">{itinerary.title}</h1>
                  <p className="text-slate-500 text-sm mt-1">{t.curatedBy} {itinerary.authorName}</p>
               </div>
               {itinerary.isVerified && <Badge color="emerald">VERIFIED</Badge>}
            </div>

            <div className="flex gap-4 my-6">
               <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="font-bold text-slate-800" style={{ direction: 'ltr' }}>{Math.floor(itinerary.totalDuration / 60)}h {itinerary.totalDuration % 60}m</span>
                  <span className="text-xs text-slate-500">{t.durationLabel}</span>
               </div>
               <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="font-bold text-slate-800" style={{ direction: 'ltr' }}>{itinerary.totalCost} SAR</span>
                  <span className="text-xs text-slate-500">{t.costLabel}</span>
               </div>
               <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600 mb-1" />
                  <span className="font-bold text-slate-800">{itinerary.places.length}</span>
                  <span className="text-xs text-slate-500">{t.stopsLabelCaps}</span>
               </div>
            </div>

            <h3 className="font-bold text-lg mb-4">{t.thePlan}</h3>
            <div className="space-y-6 relative pl-4 border-l-2 border-slate-100 ml-3 rtl:border-l-0 rtl:border-r-2 rtl:pl-0 rtl:pr-4 rtl:ml-0 rtl:mr-3">
               {itinerary.places.map((place, idx) => (
                  <div key={idx} className="relative pl-6 rtl:pl-0 rtl:pr-6">
                     <div className="absolute -left-[29px] top-0 w-8 h-8 rounded-full border-4 border-white bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm rtl:-right-[29px] rtl:left-auto">
                        {idx + 1}
                     </div>
                     <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3">
                        <img src={place.image} className="w-16 h-16 rounded-lg object-cover bg-slate-200" />
                        <div>
                           <h4 className="font-bold text-slate-900">{place.name}</h4>
                           <p className="text-xs text-slate-500 mb-1">{place.category}</p>
                           <p className="text-xs font-medium text-emerald-700">{place.avgCost} SAR • {place.duration} min</p>
                        </div>
                     </div>
                  </div>
               ))}
            </div>

            <div className="h-24"></div> {/* Spacing for fixed button */}
         </div>

         <div className="fixed bottom-0 left-0 w-full p-4 bg-white border-t border-slate-100 max-w-md mx-auto">
            <Button className="w-full shadow-emerald-200 shadow-xl" onClick={onStartGroup}>
               {t.startGroupBtn}
            </Button>
         </div>
      </div>
   );
};
