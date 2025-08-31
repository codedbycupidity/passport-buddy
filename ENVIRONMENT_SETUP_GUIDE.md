# Environment Setup Guide

## Overview

This project supports three distinct environments:
- **Development** - Local development with real backend
- **Demo** - Standalone demo with mock data (no backend needed)
- **Production** - Live production environment

## Quick Start

### Development Mode (Real Backend)
```bash
# Frontend (connects to backend at localhost:3000)
cd frontend
npm install
npm run dev

# Backend (separate terminal)
cd backend
npm install
npm run dev

# Or use Docker Compose
docker-compose up
```

### Demo Mode (Mock Data)
```bash
# Frontend only - no backend needed!
cd frontend
npm install
npm run dev:demo
```

### Production Build
```bash
cd frontend
npm run build
```

## Environment Variables

### Development (.env)
- `VITE_API_URL=http://localhost:3000`
- `VITE_DEMO_MODE=false`
- Real backend connection

### Demo (.env.demo)
- `VITE_API_URL=http://localhost:5173`
- `VITE_DEMO_MODE=true`
- Uses MSW for API mocking

### Production (.env.production)
- `VITE_API_URL=https://www.xbullet.me`
- `VITE_DEMO_MODE=false`
- Live API endpoints

## Available Scripts

### Frontend
- `npm run dev` - Development mode (real backend)
- `npm run dev:demo` - Demo mode (mock data)
- `npm run dev:prod` - Production mode locally
- `npm run build` - Production build
- `npm run build:demo` - Demo build

### Backend
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server

## Switching Between Modes

### In Development
- Add `?demo=true` to URL to enable demo mode temporarily
- Add `?demo=false` to URL to disable demo mode
- Changes require page refresh

### Environment Selection
1. **Default**: Uses `.env` (development)
2. **Demo**: Run `npm run dev:demo`
3. **Production**: Run `npm run build`

## Demo Mode Features

When running in demo mode:
- No backend required
- Mock Service Worker intercepts API calls
- Pre-populated with sample data
- Notification badge shows "Demo Mode"
- Perfect for testing UI without backend

## Troubleshooting

### Dev mode not connecting to backend?
1. Ensure backend is running on port 3000
2. Check `.env` has `VITE_API_URL=http://localhost:3000`
3. Clear localStorage: `localStorage.clear()`
4. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)

### Demo mode not working?
1. Run `npm run dev:demo` (not just `npm run dev`)
2. Check for "Demo Mode" notification
3. Ensure `public/mockServiceWorker.js` exists
4. Check console for "MSW started successfully"

### Stuck in wrong mode?
```javascript
// In browser console:
localStorage.removeItem('demoMode');
location.reload();
```

## Docker Development

### Full Stack Development
```bash
docker-compose up
```

### Frontend Only
```bash
docker-compose up frontend
```

### Backend Only
```bash
docker-compose up backend mongo
```

## Best Practices

1. **Development**: Always use `npm run dev` for real backend work
2. **Demo**: Use `npm run dev:demo` for UI development/testing
3. **Testing**: Demo mode is great for E2E tests without backend deps
4. **CI/CD**: Production builds should never have demo mode enabled

## Environment Variables Reference

| Variable | Dev | Demo | Prod | Description |
|----------|-----|------|------|-------------|
| VITE_API_URL | http://localhost:3000 | http://localhost:5173 | https://www.xbullet.me | API endpoint |
| VITE_GRAPHQL_URL | http://localhost:3000/graphql | http://localhost:5173/graphql | https://www.xbullet.me/graphql | GraphQL endpoint |
| VITE_SOCKET_URL | http://localhost:3000 | http://localhost:5173 | https://www.xbullet.me | WebSocket endpoint |
| VITE_DEMO_MODE | false | true | false | Enable demo mode |
| VITE_ENVIRONMENT | development | demo | production | Environment name |