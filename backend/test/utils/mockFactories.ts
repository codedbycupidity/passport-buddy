// Test mock factories
export const createMockUser = (overrides = {}) => ({
  _id: '123456789',
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  password: 'hashedpassword',
  emailVerified: true,
  ...overrides
});

export const createMockPost = (overrides = {}) => ({
  _id: 'post123',
  content: 'Test post content',
  author: createMockUser(),
  likes: [],
  comments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockBoardingPass = (overrides = {}) => ({
  text: 'JOHN DOE\nFLIGHT AA123\nJFK > LAX\nDEPARTURE 10:30AM',
  airline: 'AA',
  flightNumber: 'AA123',
  origin: 'JFK',
  destination: 'LAX',
  departureTime: '10:30',
  ...overrides
});
