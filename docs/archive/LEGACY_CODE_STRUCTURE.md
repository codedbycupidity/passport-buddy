# Legacy Code Structure Overview

## 🏗️ Project Architecture

This document provides a comprehensive overview of the Passport Buddy codebase structure for future maintenance.

## Root Structure
```
passport-buddy/
├── backend/          # Node.js/Express API server
├── frontend/         # React/TypeScript web application
├── mobile/          # Flutter cross-platform mobile app
├── shared/          # Shared types and utilities
├── config/          # Centralized configuration
├── scripts/         # Development and deployment scripts
├── docs/            # Comprehensive documentation
└── docker-compose.yml
```

## Backend Structure (`/backend`)

### Core Application
- `src/server.ts` - Main server entry point
- `src/app.ts` - Express application setup
- `src/api-docs.json` - API documentation

### Architecture Layers
```
src/
├── controllers/     # Request handlers
├── services/       # Business logic
├── models/         # MongoDB schemas
├── routes/         # API endpoints
├── middleware/     # Express middleware
├── utils/          # Helper functions
├── types/          # TypeScript definitions
└── config/         # App configuration
```

### Key Features
- **Authentication**: JWT-based with email verification
- **File Storage**: DigitalOcean Spaces integration
- **Email Service**: Resend API for transactional emails
- **Real-time**: Socket.io for live updates
- **GraphQL**: Apollo Server integration
- **OCR**: Tesseract for boarding pass scanning

### Testing
```
test/
├── unit/           # Unit tests
├── integration/    # API integration tests
└── utils/          # Test helpers
```

## Frontend Structure (`/frontend`)

### Core Application
- `src/main.tsx` - React entry point
- `src/App.tsx` - Main app component
- `index.html` - HTML template

### Component Organization
```
src/components/
├── auth/           # Login, register, OTP
├── feed/           # Social feed components
├── flights/        # Flight tracking
├── navigation/     # App navigation
├── profile/        # User profiles
├── ui/             # Reusable UI components
├── video/          # Video player
└── common/         # Shared components
```

### State & Data Management
```
src/
├── contexts/       # React contexts (Auth, Toast, Socket)
├── services/       # API service layers
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
└── gql/           # GraphQL generated types
```

### Configuration
- `vite.config.ts` - Build configuration
- `tailwind.config.js` - Styling configuration
- `tsconfig.json` - TypeScript configuration
- `vitest.config.ts` - Test configuration

## Mobile Structure (`/mobile`)

### Flutter Application
```
lib/
├── main.dart       # App entry point
├── app.dart        # Main app widget
├── core/           # Core functionality
├── features/       # Feature modules
├── services/       # API services
├── providers/      # State management
└── widgets/        # Reusable widgets
```

### Platform-Specific
```
android/            # Android configuration
ios/               # iOS configuration
linux/             # Linux desktop support
macos/             # macOS desktop support
windows/           # Windows desktop support
```

## Shared Module (`/shared`)

Shared TypeScript types and utilities used by both frontend and backend:
- Type definitions
- Validation schemas
- Common utilities

## Configuration (`/config`)

### Centralized Configuration
```
config/
├── environments/   # Environment configs
├── nginx/         # Web server config
├── infrastructure/ # Cloud infrastructure
├── jenkins/       # CI/CD pipelines
└── validation/    # Config validation
```

### Environment Management
- `.env.example` - Template
- `.env.dev` - Development
- `.env.staging` - Staging
- `.env.prod` - Production

## Scripts (`/scripts`)

### Organized by Purpose
```
scripts/
├── development/    # Dev tools
├── deployment/     # Deploy scripts
├── testing/        # Test runners
├── seed/          # Database seeders
├── migration/      # Data migrations
├── mobile/        # Mobile dev scripts
└── cleanup/       # Maintenance scripts
```

## Documentation (`/docs`)

### Comprehensive Guides
- API documentation
- Development guides
- Deployment procedures
- Security guidelines
- Testing strategies
- Architecture decisions

## Key Technologies

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.io
- **Email**: Resend API
- **Storage**: DigitalOcean Spaces
- **OCR**: Tesseract.js

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: React Context + Apollo Client
- **Forms**: Controlled components
- **Testing**: Vitest + React Testing Library

### Mobile Stack
- **Framework**: Flutter 3.x
- **Language**: Dart
- **State**: Provider pattern
- **Storage**: Shared preferences
- **API**: HTTP with JWT auth

### DevOps & Tools
- **Containers**: Docker + Docker Compose
- **CI/CD**: Jenkins pipelines
- **Web Server**: Nginx
- **Monitoring**: Custom health checks
- **Version Control**: Git with conventional commits

## Important Files

### Configuration Files
- `docker-compose.yml` - Container orchestration
- `Makefile` - Development commands
- `.gitignore` - Version control exclusions
- `.editorconfig` - Code style consistency

### Entry Points
- Backend: `backend/src/server.ts`
- Frontend: `frontend/src/main.tsx`
- Mobile: `mobile/lib/main.dart`

### Critical Services
- Auth: `backend/src/services/auth.service.ts`
- Socket: `backend/src/services/socket.service.ts`
- Storage: `backend/src/services/storage.service.ts`

## Maintenance Notes

### Regular Tasks
1. Update dependencies monthly
2. Rotate JWT secrets quarterly
3. Review and archive logs
4. Clean build artifacts
5. Update documentation

### Common Issues
1. **MongoDB Connection**: Check connection string
2. **CORS Errors**: Verify allowed origins
3. **Socket Disconnects**: Check auth tokens
4. **Build Failures**: Clear node_modules

### Performance Considerations
- Lazy load frontend routes
- Index MongoDB queries
- Use Redis for caching (when enabled)
- Optimize image uploads
- Enable gzip compression

## Future Considerations

### Planned Features
- Push notifications
- Offline support
- Advanced analytics
- Multi-language support

### Technical Debt
- Migrate to ES modules
- Implement comprehensive E2E tests
- Add request rate limiting
- Enhance error tracking

This structure is designed for long-term maintainability with clear separation of concerns, comprehensive documentation, and consistent patterns throughout.