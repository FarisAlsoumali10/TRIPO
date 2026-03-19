import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { itineraryAPI } from '../services/api';
import type { Place } from '../types';

export const ItineraryDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data: itinerary, isLoading, error } = useQuery(
    ['itinerary', id],
    () => itineraryAPI.getItinerary(id!),
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load itinerary.
      </div>
    );
  }

  const author = typeof itinerary.userId === 'object' ? itinerary.userId : null;

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Back to Feed
      </Link>

      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{itinerary.title}</h1>
            {itinerary.isVerified && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                ✓ Tripo Verified
              </span>
            )}
          </div>
          {itinerary.status === 'draft' && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              Draft
            </span>
          )}
        </div>

        {author && (
          <p className="text-gray-600 mb-4">
            Created by {author.name}
          </p>
        )}

        <div className="flex items-center space-x-6 text-sm text-gray-600 mb-6 pb-6 border-b">
          <span>⏱ {Math.floor(itinerary.estimatedDuration / 60)}h {itinerary.estimatedDuration % 60}m</span>
          <span>💰 {itinerary.estimatedCost === 0 ? 'Free' : `${itinerary.estimatedCost} SAR`}</span>
          <span>🚗 {itinerary.distance} km</span>
          <span>📍 {itinerary.city}</span>
        </div>

        {itinerary.notes && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Notes</h2>
            <p className="text-gray-700">{itinerary.notes}</p>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4">Itinerary ({itinerary.places.length} stops)</h2>
          <div className="space-y-4">
            {itinerary.places.map((placeItem, index) => {
              const place = placeItem.placeId as Place;
              return (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{place.name}</h3>
                    {placeItem.timeSlot && (
                      <p className="text-sm text-gray-600">⏰ {placeItem.timeSlot}</p>
                    )}
                    {placeItem.notes && (
                      <p className="text-sm text-gray-700 mt-1">{placeItem.notes}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      {place.categoryTags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-white rounded text-xs text-gray-600 border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {itinerary.ratingSummary.reviewCount > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-yellow-400 text-2xl">★</span>
                <span className="ml-2 text-2xl font-bold text-gray-900">
                  {itinerary.ratingSummary.avgRating.toFixed(1)}
                </span>
              </div>
              <span className="text-gray-600">
                Based on {itinerary.ratingSummary.reviewCount} reviews
              </span>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t">
          <button className="btn btn-primary w-full">
            Create Group Trip from This
          </button>
        </div>
      </div>
    </div>
  );
};
