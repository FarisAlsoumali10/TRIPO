import { Link } from 'react-router-dom';
import type { Itinerary, Place } from '../../types';

interface ItineraryCardProps {
  itinerary: Itinerary;
}

export const ItineraryCard = ({ itinerary }: ItineraryCardProps) => {
  const firstPlace = itinerary.places[0]?.placeId as Place;
  const author = typeof itinerary.userId === 'object' ? itinerary.userId : null;

  return (
    <Link to={`/itineraries/${itinerary._id}`} className="card hover:shadow-md transition-shadow">
      {firstPlace?.photos?.[0] && (
        <img
          src={firstPlace.photos[0]}
          alt={itinerary.title}
          className="w-full h-48 object-cover rounded-t-lg -mt-4 -mx-4 mb-4"
        />
      )}

      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{itinerary.title}</h3>
          {itinerary.isVerified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
              ✓ Tripo Verified
            </span>
          )}
        </div>
      </div>

      {author && (
        <p className="text-sm text-gray-600 mb-3">
          by {author.name}
        </p>
      )}

      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
        <span>⏱ {Math.floor(itinerary.estimatedDuration / 60)}h {itinerary.estimatedDuration % 60}m</span>
        <span>💰 {itinerary.estimatedCost === 0 ? 'Free' : `${itinerary.estimatedCost} SAR`}</span>
        <span>📍 {itinerary.places.length} stops</span>
      </div>

      {itinerary.ratingSummary.reviewCount > 0 && (
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className="text-yellow-400">★</span>
            <span className="ml-1 text-sm font-medium text-gray-900">
              {itinerary.ratingSummary.avgRating.toFixed(1)}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            ({itinerary.ratingSummary.reviewCount} reviews)
          </span>
        </div>
      )}
    </Link>
  );
};
