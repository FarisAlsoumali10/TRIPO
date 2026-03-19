import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ForYouFeed } from '../components/feed/ForYouFeed';

export const HomePage = () => {
  const { user } = useAuth();

  // Check if user has completed smart profile
  const hasCompletedProfile = user?.smartProfile.interests.length || 0 > 0;

  if (!hasCompletedProfile) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Complete Your Smart Profile
        </h1>
        <p className="text-gray-600 mb-6">
          Help us personalize your feed by completing your smart profile.
        </p>
        <Link to="/smart-profile" className="btn btn-primary">
          Complete Profile
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          For You
        </h1>
        <Link to="/itineraries/create" className="btn btn-primary">
          Create Itinerary
        </Link>
      </div>

      <ForYouFeed />
    </div>
  );
};
