import React from 'react';
import {
  ChevronLeft,
  Clock,
  Users,
  Mountain,
  Tag,
  Check,
  X,
  Star,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Tour } from '../types';

interface TourDetailScreenProps {
  tour: Tour;
  onBack: () => void;
  onBook: (tour: Tour) => void;
  t: any;
}

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-emerald-100 text-emerald-800' },
  moderate: { label: 'Moderate', color: 'bg-amber-100 text-amber-800' },
  challenging: { label: 'Challenging', color: 'bg-red-100 text-red-800' },
};

const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-SA', { weekday: 'short', day: 'numeric', month: 'short' });

export const TourDetailScreen: React.FC<TourDetailScreenProps> = ({ tour, onBack, onBook, t }) => {
  const difficulty = difficultyConfig[tour.difficulty] || difficultyConfig.easy;
  const upcomingDates = (tour.availableDates || [])
    .map((d) => new Date(d))
    .filter((d) => d > new Date())
    .slice(0, 4);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Hero Image */}
      <div className="relative flex-shrink-0" style={{ height: '18rem' }}>
        <img
          src={tour.heroImage}
          alt={tour.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80';
          }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition z-10"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>

        {/* Title overlay at bottom of hero */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="inline-block px-2.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full mb-2 uppercase tracking-wider">
            {tour.category}
          </span>
          <h1 className="text-2xl font-extrabold text-white leading-tight drop-shadow">{tour.title}</h1>
          {tour.rating !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-white font-bold text-sm">{tour.rating.toFixed(1)}</span>
              {tour.reviewCount !== undefined && (
                <span className="text-white/70 text-xs">({tour.reviewCount} reviews)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-2 px-5 py-4 border-b border-slate-100">
          <div className="flex flex-col items-center gap-1">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">{tour.totalDuration}h</span>
            <span className="text-[10px] text-slate-400">Duration</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Users className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">Max {tour.maxGroupSize}</span>
            <span className="text-[10px] text-slate-400">Group size</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Mountain className="w-5 h-5 text-emerald-600" />
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${difficulty.color}`}>
              {difficulty.label}
            </span>
            <span className="text-[10px] text-slate-400">Difficulty</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Tag className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">{tour.pricePerPerson}</span>
            <span className="text-[10px] text-slate-400">SAR/person</span>
          </div>
        </div>

        <div className="px-5 py-5 space-y-8">
          {/* Description */}
          <p className="text-slate-600 text-sm leading-relaxed">{tour.description}</p>

          {/* Departure info */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
            <MapPin className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Departure</p>
              <p className="text-sm font-semibold text-slate-800">{tour.departureLocation}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {tour.departureTime}
                {tour.returnTime ? ` — Return by ${tour.returnTime}` : ''}
              </p>
            </div>
          </div>

          {/* Highlights */}
          {tour.highlights.length > 0 && (
            <div>
              <h2 className="text-base font-extrabold text-slate-900 mb-3">Highlights</h2>
              <ul className="space-y-2">
                {tour.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Day Plan / Stops */}
          {tour.stops.length > 0 && (
            <div>
              <h2 className="text-base font-extrabold text-slate-900 mb-4">Your Day Plan</h2>
              <div className="relative">
                {/* Vertical connector line */}
                <div className="absolute left-[1.375rem] top-6 bottom-6 w-0.5 bg-slate-100" />

                <div className="space-y-5">
                  {tour.stops.map((stop, i) => (
                    <div key={i} className="flex gap-4 relative">
                      {/* Time bubble */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-extrabold shadow-md z-10">
                          {stop.order}
                        </div>
                        {stop.timeSlot && (
                          <span className="text-[9px] text-emerald-700 font-bold mt-1 whitespace-nowrap">
                            {stop.timeSlot}
                          </span>
                        )}
                      </div>

                      {/* Content card */}
                      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          {stop.image && (
                            <img
                              src={stop.image}
                              alt={stop.placeName}
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-slate-900 text-sm">{stop.placeName}</h3>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                                {stop.duration} min
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">{stop.description}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* What's Included / Not Included */}
          {(tour.included.length > 0 || tour.excluded.length > 0) && (
            <div>
              <h2 className="text-base font-extrabold text-slate-900 mb-3">What's Included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tour.included.length > 0 && (
                  <div className="bg-emerald-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Included</p>
                    <ul className="space-y-1.5">
                      {tour.included.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-emerald-900">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tour.excluded.length > 0 && (
                  <div className="bg-red-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2">Not Included</p>
                    <ul className="space-y-1.5">
                      {tour.excluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-red-900">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Guide Card */}
          <div>
            <h2 className="text-base font-extrabold text-slate-900 mb-3">Your Guide</h2>
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
              <img
                src={tour.guideAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tour.guideName}`}
                alt={tour.guideName}
                className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover bg-slate-100"
              />
              <div className="flex-1">
                <h3 className="font-extrabold text-slate-900">{tour.guideName}</h3>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  Certified Guide
                </span>
                {tour.guideRating !== undefined && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(tour.guideRating!)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 fill-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-slate-500 ml-1">{tour.guideRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Dates */}
          {upcomingDates.length > 0 && (
            <div>
              <h2 className="text-base font-extrabold text-slate-900 mb-3">Upcoming Dates</h2>
              <div className="flex flex-wrap gap-2">
                {upcomingDates.map((date, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-full"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(date)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews placeholder */}
          <div>
            <h2 className="text-base font-extrabold text-slate-900 mb-3">
              Reviews
              {tour.reviewCount !== undefined && (
                <span className="ml-2 text-sm font-semibold text-slate-400">({tour.reviewCount})</span>
              )}
            </h2>
            {(tour.reviewCount === undefined || tour.reviewCount === 0) ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl">
                <Star className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No reviews yet — be the first to experience this tour!</p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl flex items-center gap-3">
                <Star className="w-8 h-8 text-amber-400 fill-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-extrabold text-slate-900 text-2xl">{tour.rating?.toFixed(1)}</p>
                  <p className="text-sm text-slate-500">Based on {tour.reviewCount} reviews</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="flex-shrink-0 bg-white border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div>
          <p className="text-xs text-slate-400">From</p>
          <p className="text-2xl font-extrabold text-emerald-700">
            {tour.pricePerPerson.toLocaleString()}
            <span className="text-sm font-bold text-slate-500 ml-1">SAR</span>
          </p>
          <p className="text-[10px] text-slate-400">per person</p>
        </div>
        <button
          onClick={() => onBook(tour)}
          className="flex-1 max-w-xs py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-teal-600 transition active:scale-95 text-base"
        >
          Book This Trip
        </button>
      </div>
    </div>
  );
};
