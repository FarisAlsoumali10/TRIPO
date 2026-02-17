import request from 'supertest';
import { app } from '../../src/server';
import { User } from '../../src/models';

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          language: 'en',
          smartProfile: {
            interests: ['food', 'culture'],
            preferredBudget: 'medium',
            activityStyles: ['relaxed'],
            typicalFreeTimeWindow: 180,
            city: 'Riyadh'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should not register with duplicate email', async () => {
      await User.create({
        email: 'existing@example.com',
        passwordHash: 'hash',
        name: 'Existing User',
        smartProfile: {
          interests: [],
          preferredBudget: 'medium',
          activityStyles: [],
          typicalFreeTimeWindow: 180,
          city: 'Riyadh'
        }
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
          language: 'en',
          smartProfile: {
            interests: [],
            preferredBudget: 'medium',
            activityStyles: [],
            typicalFreeTimeWindow: 180,
            city: 'Riyadh'
          }
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
          name: 'Login User',
          language: 'en',
          smartProfile: {
            interests: [],
            preferredBudget: 'medium',
            activityStyles: [],
            typicalFreeTimeWindow: 180,
            city: 'Riyadh'
          }
        });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });
});
