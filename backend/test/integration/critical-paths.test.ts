import request from 'supertest';
import app from '../../src/app';
import User from '../../src/models/User';
import { createMockUser } from '../utils/mockFactories';

describe('Critical Path Tests', () => {
  describe('Authentication Flow', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          fullName: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'Test123!',
          passwordConfirm: 'Test123!'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.message).toContain('verification');
    });
    
    it('should login with valid credentials', async () => {
      const user = await User.create(createMockUser({
        password: 'Test123!',
        emailVerified: true
      }));
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: user.email,
          password: 'Test123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });
  
  describe('Post Creation', () => {
    it('should create a post with authentication', async () => {
      // Add post creation test
    });
  });
  
  describe('Flight Upload', () => {
    it('should process boarding pass image', async () => {
      // Add boarding pass test
    });
  });
});
