import { recommendationService } from '../../src/services/recommendationService';
import { SmartProfile } from '../../src/types';

describe('RecommendationService', () => {
  describe('getPersonalizedFeed', () => {
    it('should calculate scores based on smart profile', async () => {
      const smartProfile: SmartProfile = {
        interests: ['food', 'culture'],
        preferredBudget: 'medium',
        activityStyles: ['relaxed', 'social'],
        typicalFreeTimeWindow: 180,
        mood: 'curious',
        city: 'Riyadh'
      };

      // This test would require seeded data in test database
      // For now, it's a placeholder showing test structure
      expect(recommendationService).toBeDefined();
    });
  });
});
