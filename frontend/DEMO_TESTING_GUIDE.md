# Demo Mode Testing Guide

## How to Verify Demo Mode Isolation

### What is Demo Mode?
Demo mode uses Mock Service Worker (MSW) to intercept API calls in the browser and return mock data. This allows the frontend to work without a backend.

### Key Points:
1. **Demo mode is ONLY activated when `?demo=true` is in the URL**
2. **Normal access (without the query parameter) connects to the real backend**
3. **MSW is only loaded when demo mode is explicitly requested**

### Manual Testing Steps:

#### Test 1: Normal Mode (Production/Dev Behavior)
1. Open the app at `http://localhost:3001` (dev) or your production URL
2. Open browser DevTools > Network tab
3. Try to login with any credentials
4. **Expected Result**: 
   - You'll see real API calls to your backend
   - If backend is not running, you'll get connection errors
   - No demo notification appears

#### Test 2: Demo Mode
1. Open the app at `http://localhost:3001?demo=true`
2. You should see the demo notification popup (bottom right)
3. Try to login with demo credentials:
   - Email: `demo@passport-buddy.com`
   - Password: `demo123`
4. **Expected Result**:
   - Login works with mock data
   - All API calls are intercepted by MSW
   - You can browse the app with demo data

#### Test 3: Switching Between Modes
1. Start in demo mode: `http://localhost:3001?demo=true`
2. Click "Exit Demo" button in the notification
3. **Expected Result**:
   - Redirected to `http://localhost:3001` (no query parameter)
   - Demo mode is deactivated
   - App now tries to connect to real backend

#### Test 4: API Isolation Check
In browser console:

**Normal Mode:**
```javascript
// This should fail or connect to real backend
fetch('/api/auth/verify').then(r => console.log('Status:', r.status))
```

**Demo Mode:**
```javascript
// This should return 200 (mocked by MSW)
fetch('/api/auth/verify').then(r => console.log('Status:', r.status))
```

### How It Works:

1. **main.tsx** checks for `?demo=true` in URL
2. If found, it:
   - Sets `window.__DEMO_MODE__ = true`
   - Imports and starts MSW with demo handlers
   - Shows demo notification
3. If not found:
   - Normal app initialization
   - No MSW loaded
   - Connects to real backend

### Verifying in Production:

1. **Your Production URL**: Regular app behavior, connects to backend
2. **Your Production URL?demo=true**: Demo mode with mock data

This ensures complete separation between demo and production environments!