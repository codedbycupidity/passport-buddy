# Testing Infrastructure Setup

## Current Status

### ✅ What's Working
1. **Basic unit tests** - Simple functions like OTP generation
2. **Test environment** - MongoDB connection, JWT secrets configured
3. **Test utilities** - Mock factories for common data structures
4. **Coverage reporting** - Jest configured with coverage thresholds

### ⚠️ Known Issues
1. **Time handling tests** - Strict date validation causing failures
2. **Boarding pass tests** - OCR validation expectations need adjustment
3. **Frontend mocks** - Some context providers not properly mocked

### 🚀 Quick Test Commands

```bash
# Run all tests with our custom runner
./scripts/testing/test-runner.sh

# Run with coverage
./scripts/testing/test-runner.sh --coverage

# Backend tests only
cd backend && npm test

# Frontend tests only
cd frontend && npm test -- --run

# Single test file
cd backend && npm test -- path/to/test.ts

# Watch mode (development)
cd backend && npm test -- --watch
```

## Test Structure

### Backend Tests
```
backend/
├── test/
│   ├── unit/           # Unit tests for utilities
│   ├── integration/    # API integration tests
│   └── utils/          # Test helpers and mocks
└── src/tests/          # Legacy test location
```

### Frontend Tests
```
frontend/
├── test/
│   ├── components/     # Component tests
│   ├── utils/          # Test utilities
│   └── setup.ts        # Test environment setup
└── src/tests/          # Additional test files
```

## Critical Path Coverage

### Must Test
1. **Authentication Flow**
   - ✅ User registration
   - ✅ Login/logout
   - ✅ Token validation
   - ⚠️ Password reset
   - ⚠️ Email verification

2. **Core Features**
   - ⚠️ Post creation
   - ⚠️ Media upload
   - ⚠️ Boarding pass OCR
   - ⚠️ Flight data extraction

3. **Social Features**
   - ⚠️ Like/unlike posts
   - ⚠️ Comments
   - ⚠️ Follow/unfollow
   - ⚠️ Real-time notifications

## Coverage Goals

- **Statements**: 60% minimum
- **Branches**: 60% minimum  
- **Functions**: 60% minimum
- **Lines**: 60% minimum

## CI/CD Integration (Next Step)

Ready for GitHub Actions once tests are stable:
1. Run on every PR
2. Block merge if tests fail
3. Generate coverage reports
4. Comment results on PR

## Troubleshooting

### MongoDB Connection Issues
```bash
# Ensure MongoDB is running
docker-compose up -d mongo

# Check connection
docker exec mernflutter-mongo-1 mongosh -u root -p pass --authenticationDatabase admin --eval "db.adminCommand('ping')"
```

### Test Timeouts
- Increase Jest timeout: `jest.setTimeout(30000)`
- Check async operations are properly awaited
- Ensure database connections are closed

### Mock Issues
- Use provided mock factories in `test/utils/mockFactories.ts`
- Check all contexts are wrapped in test providers
- Verify environment variables are set