import { useState } from 'react';
import { useQuery } from 'react-query';
import { itineraryAPI } from '../../services/api';
import { ItineraryCard } from './ItineraryCard';

export const ForYouFeed = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery(
    ['feed', page],
    () => itineraryAPI.getFeed(page, 20),
    { keepPreviousData: true }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load feed. Please try again.
      </div>
    );
  }

  if (!data?.itineraries || data.itineraries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No itineraries found yet.</p>
        <p className="text-gray-500 mt-2">Check back soon or adjust your Smart Profile!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.itineraries.map((itinerary: any) => (
          <ItineraryCard key={itinerary._id} itinerary={itinerary} />
        ))}
      </div>

      {data.pages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {page} of {data.pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            className="btn btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
