# Demo Mode Persistence Verification

## How Demo Mode Actually Works:

### 1. Initial Activation
- Visit `http://localhost:3001?demo=true`
- This sets `localStorage.setItem('demoMode', 'true')` (line 21 in main.tsx)
- MSW is loaded and starts intercepting API calls

### 2. Navigation Persistence
- When you navigate to other pages (Profile, Flights, etc.)
- The app checks: `localStorage.getItem('demoMode') === 'true'` (line 16 in main.tsx)
- Since it's in localStorage, demo mode STAYS ACTIVE
- You don't need `?demo=true` in the URL anymore

### 3. Exit Demo Mode
- Click "Exit Demo" button
- This removes 'demoMode' from localStorage
- Redirects to URL without query params
- App restarts without demo mode

## Test This Yourself:

1. **Start Demo Mode**:
   - Go to `http://localhost:3001?demo=true`
   - You'll see the demo notification
   
2. **Navigate Around**:
   - Click on Profile, Flights, Earth, etc.
   - Demo mode stays active (notification persists)
   - URLs don't need `?demo=true` anymore
   
3. **Check Persistence**:
   - Open browser console
   - Type: `localStorage.getItem('demoMode')`
   - Should return: `"true"`
   
4. **Exit Demo Mode**:
   - Click "Exit Demo" button
   - Page reloads without demo mode
   - Type in console: `localStorage.getItem('demoMode')`
   - Should return: `null`

## The Code That Makes It Work:

```typescript
// main.tsx line 15-17
const isDemoMode = urlParams.get('demo') === 'true' || 
                   localStorage.getItem('demoMode') === 'true' ||
                   import.meta.env.VITE_DEMO_MODE === 'true';
```

This checks THREE things:
1. Is `?demo=true` in current URL?
2. Is `demoMode` in localStorage?
3. Is `VITE_DEMO_MODE` env var set?

If ANY of these is true, demo mode activates!