import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import type { SmartProfile } from '../../types';

const INTERESTS_OPTIONS = [
  'Food & Dining', 'Nature & Parks', 'Culture & Museums', 'Shopping',
  'Adventure', 'Sports', 'Art', 'History', 'Photography'
];

const ACTIVITY_STYLES = [
  'Relaxed', 'Active', 'Social', 'Explorer', 'Cultural', 'Peaceful'
];

const MOODS = [
  'Adventurous', 'Chill', 'Curious', 'Social', 'Romantic'
];

export const SmartProfileOnboarding = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState<Partial<SmartProfile>>({
    interests: user?.smartProfile.interests || [],
    preferredBudget: user?.smartProfile.preferredBudget || 'medium',
    activityStyles: user?.smartProfile.activityStyles || [],
    typicalFreeTimeWindow: user?.smartProfile.typicalFreeTimeWindow || 180,
    mood: user?.smartProfile.mood || '',
    city: user?.smartProfile.city || ''
  });

  const toggleSelection = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await authAPI.updateSmartProfile(profile);
      if (user) {
        updateUser({ ...user, smartProfile: { ...user.smartProfile, ...profile } as SmartProfile });
      }
      navigate('/');
    } catch (error) {
      console.error('Failed to update smart profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Smart Profile</h1>
          <p className="mt-2 text-gray-600">Help us personalize your experience</p>
          <div className="mt-4 flex justify-center space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${i <= step ? 'bg-primary-600' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </div>

        <div className="card">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">What are your interests?</h2>
              <p className="text-gray-600 mb-6">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {INTERESTS_OPTIONS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => setProfile({
                      ...profile,
                      interests: toggleSelection(profile.interests || [], interest)
                    })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      profile.interests?.includes(interest)
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Your typical free time window</h2>
              <p className="text-gray-600 mb-6">How much time do you usually have for an outing?</p>
              <div className="space-y-3">
                {[60, 120, 180, 240].map(minutes => (
                  <button
                    key={minutes}
                    onClick={() => setProfile({ ...profile, typicalFreeTimeWindow: minutes })}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      profile.typicalFreeTimeWindow === minutes
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {minutes / 60} hour{minutes > 60 ? 's' : ''}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Budget</label>
                <select
                  className="input"
                  value={profile.preferredBudget}
                  onChange={(e) => setProfile({ ...profile, preferredBudget: e.target.value as any })}
                >
                  <option value="free">Free</option>
                  <option value="low">Low (0-100 SAR)</option>
                  <option value="medium">Medium (50-300 SAR)</option>
                  <option value="high">High (200-1000 SAR)</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Your activity style</h2>
              <p className="text-gray-600 mb-6">Select all that describe you</p>
              <div className="grid grid-cols-2 gap-3">
                {ACTIVITY_STYLES.map(style => (
                  <button
                    key={style}
                    onClick={() => setProfile({
                      ...profile,
                      activityStyles: toggleSelection(profile.activityStyles || [], style)
                    })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      profile.activityStyles?.includes(style)
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Current mood (optional)</h2>
              <p className="text-gray-600 mb-6">What vibe are you looking for today?</p>
              <div className="space-y-3">
                {MOODS.map(mood => (
                  <button
                    key={mood}
                    onClick={() => setProfile({ ...profile, mood })}
                    className={`w-full p-4 rounded-lg border-2 transition-colors ${
                      profile.mood === mood
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 && (
              <button onClick={handleBack} className="btn btn-secondary">
                Back
              </button>
            )}
            {step < 4 ? (
              <button onClick={handleNext} className="btn btn-primary ml-auto">
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary ml-auto"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
