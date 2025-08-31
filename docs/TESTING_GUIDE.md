# Comprehensive Testing Guide

## Overview

Passport Buddy uses a multi-layered testing approach across all platforms.

## Quick Test Commands

```bash
# Run all tests
make test

# Run specific platform tests
make test-backend
make test-frontend
make test-mobile

# Run with coverage
make test-coverage

# Run specific test file
cd backend && npm test -- auth.test.ts
cd frontend && npm test -- PostCard.test.tsx
```

## Backend Testing

### Test Structure
```
backend/
├── test/
│   ├── unit/           # Unit tests
│   ├── integration/    # API integration tests
│   └── utils/          # Test helpers
└── __tests__/          # Additional test files
```

### Running Backend Tests
```bash
# All backend tests
cd backend && npm test

# Watch mode
cd backend && npm test -- --watch

# Coverage report
cd backend && npm test -- --coverage

# Specific test pattern
cd backend && npm test -- --testNamePattern="authentication"
```

### Test Categories

#### Unit Tests
- Location: `test/unit/`
- Focus: Individual functions and utilities
- Example: `generateOtp.test.ts`

#### Integration Tests
- Location: `test/integration/`
- Focus: API endpoints and database operations
- Example: `auth.test.ts`

#### Critical Path Tests
- Authentication flow
- Post creation with media
- Boarding pass OCR
- Real-time notifications

## Frontend Testing

### Test Structure
```
frontend/
├── test/
│   ├── setup.ts        # Test environment setup
│   └── utils/          # Test utilities
└── src/tests/          # Component tests
```

### Running Frontend Tests
```bash
# All frontend tests
cd frontend && npm test

# Watch mode
cd frontend && npm test -- --watch

# Coverage
cd frontend && npm run test:coverage

# Update snapshots
cd frontend && npm test -- -u
```

### Test Types

#### Component Tests
- Test individual components in isolation
- Use React Testing Library
- Mock external dependencies

#### Hook Tests
- Test custom React hooks
- Use `@testing-library/react-hooks`

#### Integration Tests
- Test component interactions
- Test API integrations
- Use MSW for API mocking

## Mobile Testing

### Running Flutter Tests
```bash
# All tests
cd mobile && flutter test

# Specific test file
cd mobile && flutter test test/auth_test.dart

# With coverage
cd mobile && flutter test --coverage

# Integration tests
cd mobile && flutter test integration_test/
```

### Test Structure
```
mobile/
├── test/               # Unit and widget tests
├── integration_test/   # Integration tests
└── test_driver/        # E2E tests
```

## Test Configuration

### Backend (Jest)
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
```

### Frontend (Vitest)
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts'
  }
});
```

## Writing Tests

### Backend Test Example
```typescript
describe('Auth Service', () => {
  it('should hash password correctly', async () => {
    const password = 'Test123!';
    const hashed = await authService.hashPassword(password);
    expect(hashed).not.toBe(password);
    expect(await authService.verifyPassword(password, hashed)).toBe(true);
  });
});
```

### Frontend Test Example
```tsx
describe('PostCard', () => {
  it('should render post content', () => {
    const post = mockPost();
    render(<PostCard post={post} />);
    expect(screen.getByText(post.content)).toBeInTheDocument();
  });
});
```

### Mobile Test Example
```dart
testWidgets('Login button enables when form valid', (tester) async {
  await tester.pumpWidget(MaterialApp(home: LoginScreen()));
  
  await tester.enterText(find.byKey(Key('email')), 'test@example.com');
  await tester.enterText(find.byKey(Key('password')), 'Test123!');
  await tester.pump();
  
  expect(find.byType(ElevatedButton), findsOneWidget);
  expect(tester.widget<ElevatedButton>(find.byType(ElevatedButton)).enabled, true);
});
```

## Test Data

### Mock Factories
- Backend: `test/utils/mockFactories.ts`
- Frontend: `test/utils/mockData.ts`
- Mobile: `test/fixtures/`

### Test Users
```bash
# View test users
make test-users

# Seed test data
make seed
```

## Coverage Requirements

- **Minimum**: 60% for all metrics
- **Target**: 80% for critical paths
- **Reports**: Generated in `coverage/` directories

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Pre-deployment

## Best Practices

1. **Write tests first** (TDD)
2. **Test behavior, not implementation**
3. **Keep tests simple and focused**
4. **Use descriptive test names**
5. **Mock external dependencies**
6. **Clean up after tests**
7. **Avoid testing framework code**

## Debugging Tests

```bash
# Run single test with debugging
node --inspect-brk node_modules/.bin/jest auth.test.ts

# Frontend debugging
cd frontend && npm test -- --no-coverage --inspect

# Mobile debugging
flutter test --start-paused test/auth_test.dart
```

## Common Issues

### Backend
- **MongoDB connection**: Ensure test database is running
- **JWT errors**: Check JWT_SECRET in test environment
- **Timeout errors**: Increase Jest timeout

### Frontend
- **act() warnings**: Wrap state updates in act()
- **Module not found**: Check import paths
- **Snapshot mismatches**: Update with -u flag

### Mobile
- **Widget not found**: Check widget keys
- **Async issues**: Use proper pump/pumpAndSettle
- **Platform errors**: Mock platform channels

## Test Utilities

### Custom Matchers
- `toBeValidEmail()`
- `toBeValidJWT()`
- `toMatchSnapshot()`

### Helper Functions
- `createTestUser()`
- `mockAuthContext()`
- `waitForElement()`

## Performance Testing

```bash
# Load testing
npm run test:load

# Stress testing
npm run test:stress
```

## Security Testing

- Input validation tests
- Authentication tests
- Authorization tests
- XSS prevention tests
- SQL injection tests

## Continuous Improvement

1. Monitor test execution time
2. Remove flaky tests
3. Increase coverage incrementally
4. Review and refactor tests
5. Keep dependencies updated

Remember: Good tests make refactoring safe and deployment confident!