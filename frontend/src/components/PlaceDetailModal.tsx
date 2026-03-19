import React, { useState, useEffect } from 'react';
import { X, Star, MapPin, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
// 🔴 تم إصلاح المسافة الخاطئة في مسار الاستيراد هنا
import { Place, Rental } from '../types/index';

interface PlaceDetailModalProps {
  place: Place | Rental;
  onClose: () => void;
  t: any;
}

export const PlaceDetailModal = ({ place, onClose, t }: PlaceDetailModalProps) => {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Determine properties safely based on type
  const placeName = 'title' in place ? place.title : place.name;
  const placeCat = 'type' in place ? place.type : place.categoryTags;
  const placePrice = 'price' in place ? place.price : place.avgCost;
  const placeLocation = 'locationName' in place ? place.locationName : 'Riyadh';

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Prompt Gemini to act as a summarizer for Google Maps reviews
        const prompt = `
          Provide a concise 50-word summary of the "Google Maps" reviews and general public reputation for "${placeName}" in Riyadh.
          Mention what people love (e.g. atmosphere, specific dishes) and any common complaints.
          Tone: Helpful and informative.
          Language: ${t.aiSummaryTitle?.includes('ملخص') ? 'Arabic' : 'English'}.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', // 🔴 تم تحديث النموذج للنسخة الأسرع والأكثر استقراراً
          contents: prompt,
        });

        setSummary(response.text || t.aiSummaryError || 'No summary available.');
      } catch (error) {
        console.error("Summary gen error:", error);
        setSummary(t.aiSummaryError || 'Failed to load summary. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [place, placeName, t.aiSummaryTitle, t.aiSummaryError]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-300">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image */}
        <div className="h-48 w-full relative bg-slate-200">
          <img
            src={place.image || 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=80'}
            className="w-full h-full object-cover"
            alt={placeName}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&q=80'; // Fallback pattern
            }}
          />
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/80 to-transparent"></div>
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-xl font-bold">{placeName}</h2>
            <p className="text-sm opacity-90 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {placeLocation}
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
              <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="font-bold text-slate-900">{place.rating || 'N/A'}</span>
              <span className="text-xs text-slate-500">Google Maps</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-emerald-600 text-lg">{placePrice} <span className="text-xs text-slate-500">SAR</span></p>
              <p className="text-xs text-slate-400">{placeCat}</p>
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-blue-500"></div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-sm text-slate-900">{t.aiSummaryTitle || 'AI Summary'}</h3>
            </div>

            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                <p className="text-xs text-slate-400 mt-2">{t.aiSummaryLoading || 'Loading insights...'}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
                <p className="text-[10px] text-slate-400 mt-3 text-right italic">{t.aiSource || 'Generated by Gemini AI'}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};