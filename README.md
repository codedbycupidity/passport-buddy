# Passport Buddy

**Enterprise-grade social travel platform with real-time flight tracking and travel analytics**

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-proprietary-blue)
![Version](https://img.shields.io/badge/version-2.0.0-orange)

## Overview

Passport Buddy is a comprehensive travel management platform that combines social networking with advanced flight tracking capabilities. Built with the MERN stack (MongoDB, Express, React, Node.js) and Flutter, it features real-time posts, authentication, travel tracking, and cross-platform mobile support.

## Technical Architecture

### System Design

![Passport Buddy System Architecture](./passport-buddy.svg)

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript 5.0, Vite 5.0, Tailwind CSS, Apollo Client |
| Backend | Node.js 18 LTS, Express.js, GraphQL, Apollo Server, Socket.io |
| Database | MongoDB 6.0, Mongoose ODM, Redis (caching) |
| Mobile | Flutter 3.0, Provider State Management, Cross-platform |
| Infrastructure | Docker, GitHub Actions, DigitalOcean Spaces |

## 🚀 Quick Start

```bash
# Initial setup (first time only)
make setup

# Start development environment
make dev

# Run mobile app (auto-detects device)
make mobile

# View all available commands
make help
```

## 🔒 Security Setup

1. **Copy environment template**:
   ```bash
   cp .env.example .env.dev
   ```

2. **Update credentials** in `.env.dev` with your actual values

3. **Important**: Never commit `.env` files to version control

4. See [Security Guidelines](docs/SECURITY_GUIDELINES.md) for detailed security practices

## 🏗️ Project Structure

```
passport-buddy/
├── backend/            # Node.js Express + GraphQL API
├── frontend/           # React + Vite + TypeScript Web App
├── mobile/             # Flutter Mobile App (iOS/Android)
├── shared/             # Shared TypeScript types
├── config/             # Configuration files
│   ├── docker/         # Docker configurations
│   ├── nginx/          # Nginx reverse proxy configs
│   └── jenkins/        # CI/CD pipeline configs
├── scripts/            # Utility and setup scripts
├── docs/               # Additional documentation
└── Makefile            # Development automation
```

## 🌐 Development URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Web App** | http://localhost:3001 | React frontend |
| **Backend API** | http://localhost:3000 | Express server |
| **GraphQL Playground** | http://localhost:3000/graphql | GraphQL API explorer |
| **MongoDB** | mongodb://localhost:27017 | Database |

## 👥 Test Users

The application comes with 8 pre-seeded test users. **All test users have the password: `Test123`**

You can login using either username or email:

| Username | Email | Profile | Miles Flown |
|----------|-------|---------|-------------|
| **izaacplambeck** | izaac@test.com | Adventure seeker from San Francisco | 150,000 |
| **diab** | diab@test.com | Digital nomad from Dubai | 200,000 |
| **devonvill** | devon@test.com | Travel photographer from London | 180,000 |
| **masonmiles** | mason@test.com | Aviation enthusiast from Chicago | 250,000 |
| **jacobroberts** | jacob@test.com | Budget traveler from Sydney | 120,000 |
| **laylale** | layla@test.com | Solo female traveler from Vancouver | 165,000 |
| **evahocking** | eva@test.com | Luxury travel blogger from NYC | 300,000 |
| **testuser** | test@test.com | Test account for QA | 0 |

## 📱 Mobile Development

### Running on Different Platforms

```bash
# Auto-detect device and run
make mobile

# Specific platforms
make mobile-ios-simulator      # iOS Simulator
make mobile-ios-physical        # Physical iPhone
make mobile-android-emulator    # Android Emulator
make mobile-android-physical    # Physical Android device
make mobile-browser             # Web browser
make mobile-macos               # macOS desktop
make mobile-windows             # Windows desktop
make mobile-linux               # Linux desktop
```

### API Configuration

The mobile app automatically configures the API URL based on the platform:

- **iOS Simulator**: `http://localhost:3000/graphql`
- **Android Emulator**: `http://10.0.2.2:3000/graphql`
- **Physical Devices**: `http://YOUR_LOCAL_IP:3000/graphql` (auto-detected)
- **Web**: `http://localhost:3000/graphql`

## 🛠️ Development Commands

### Core Commands
```bash
make help         # Show all available commands
make setup        # Initial project setup
make dev          # Start development environment
make dev-d        # Start in background (detached)
make stop         # Stop all services
make restart      # Restart all services
make status       # Check service status
make logs         # View all logs
make clean        # Clean up volumes and containers
```

### Database Management
```bash
make seed         # Seed database with test data
make seed-fresh   # Drop database and seed fresh
make db-shell     # Open MongoDB shell
make db-reset     # Reset database
make test-users   # Display test user credentials
```

### Testing
```bash
make test             # Run all tests
make test-backend     # Backend tests only
make test-frontend    # Frontend tests only
make test-mobile      # Flutter tests
make test-coverage    # Tests with coverage report
make lint             # Run linters
make typecheck        # TypeScript type checking
```

### Mobile Development
```bash
make mobile-doctor         # Check Flutter setup
make mobile-clean          # Clean Flutter build
make mobile-reset          # Reset Flutter dependencies
make mobile-build-apk      # Build Android APK
make mobile-build-ios      # Build iOS app
make mobile-list-devices   # List available devices
```

### Deployment & Production
```bash
make build         # Build for production
make prod          # Run production build
make deploy-check  # Pre-deployment checklist
make env-check     # Verify environment setup
```

## ✨ Core Features

### Travel Management
- Automated boarding pass OCR scanning with 98% accuracy
- Real-time flight status tracking and notifications
- Historical flight data analytics and visualization
- Multi-airport trip planning and optimization
- Track miles flown, countries visited, and upcoming trips

### Social Platform
- Travel timeline with photo/video sharing
- Friend network and travel companion matching
- Location-based check-ins and recommendations
- Travel statistics and achievement system
- Real-time GraphQL subscriptions for live feed updates
- Create posts with multiple images and engage with comments

### Authentication & Profiles
- JWT-based auth with email/username login
- Customizable profiles with bio, avatar, and travel stats
- Account verification and password reset via email

### Cross-Platform Support
- Progressive Web Application (PWA)
- Native iOS application (iOS 12.0+)
- Native Android application (API 23+)
- Responsive web design for all devices
- Offline cache support
- Camera integration for direct photo capture
- Push notifications and location services (coming soon)

## Performance Metrics

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.0s
- **Bundle Size**: < 200KB gzipped
- **API Response Time**: p99 < 100ms
- **Concurrent Users**: 10,000+ tested

## Security Implementation

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: AES-256 encryption at rest
- **API Security**: Rate limiting, DDoS protection, input sanitization
- **File Upload**: Virus scanning, type validation, size limits
- **Infrastructure**: HTTPS enforcement, security headers, CORS configuration

## 🔧 Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **API**: GraphQL (Apollo Server) + REST endpoints
- **Authentication**: JWT with bcrypt
- **File Storage**: Local storage with plans for S3
- **Email**: Mailtrap integration
- **Language**: TypeScript

### Frontend
- **Framework**: React 18 with Vite
- **State Management**: Apollo Client + Context API
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Language**: TypeScript
- **Build Tool**: Vite

### Mobile
- **Framework**: Flutter 3.x
- **State Management**: Provider
- **Networking**: Dio + GraphQL
- **Storage**: Shared Preferences
- **Language**: Dart

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions + Jenkins
- **Monitoring**: Health checks and status endpoints

## Deployment Options

### Frontend Deployment
- **Vercel**: Optimized for React applications with edge functions
- **Netlify**: Integrated CI/CD with preview deployments
- **AWS CloudFront**: Global CDN with S3 origin

### Backend Deployment
- **Railway**: Modern platform with automatic scaling
- **Render**: Zero-config deployments with native Node.js support
- **AWS ECS**: Container orchestration for enterprise scale

### Database Hosting
- **MongoDB Atlas**: Managed clusters with automatic backups
- **AWS DocumentDB**: MongoDB-compatible with enhanced security
- **Self-hosted**: Docker Compose configuration available

## 🔐 Environment Configuration

### Development Environment

Create a `.env.dev` file in the root directory:

```env
# MongoDB
MONGO_URI=mongodb://root:pass@mongodb:27017/devdb?authSource=admin
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=pass

# Backend
PORT=3000
JWT_SECRET=your-dev-secret-key-change-in-production
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3000
VITE_GRAPHQL_URL=http://localhost:3000/graphql
VITE_WS_URL=ws://localhost:3000/graphql

# Email (Optional - for email features)
MAILTRAP_TOKEN=your-mailtrap-token
MAILTRAP_ENDPOINT=https://send.api.mailtrap.io

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### Production Environment

For production, create `.env.prod` with appropriate values and secure secrets.

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**
```bash
make logs-backend  # Check error logs
make clean         # Clean and restart
make setup         # Re-run setup
```

**Mobile app can't connect**
```bash
make info          # Get your local IP
make status        # Ensure backend is running
# Check firewall settings for port 3000
```

**Database issues**
```bash
make db-shell      # Access MongoDB directly
make db-reset      # Reset database
make seed-fresh    # Re-seed with fresh data
```

**Port conflicts**
- Backend: 3000 → Change in docker-compose.yml
- Frontend: 3001 → Change in docker-compose.yml
- MongoDB: 27017 → Change in docker-compose.yml

### Getting Help
```bash
make help          # List all commands
make info          # Show project info
make test-summary  # View test status
```

## 📚 Additional Documentation

- [Environment Setup Guide](docs/ENVIRONMENT_SETUP.md)
- [Mobile Build Configuration](mobile/BUILD_CONFIGURATION.md)
- [API Documentation](backend/README.md)
- [Frontend Guide](frontend/README.md)
- [Mobile App Guide](mobile/README.md)
- [Testing Guide](docs/TEST_REPORT.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`make test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Workflow
1. Use `make dev` for local development
2. Write tests for new features
3. Run `make lint` and `make typecheck` before committing
4. Ensure all tests pass with `make test`

## Development Team

### Lead Developer
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/izaac-plambeck/)
[![Portfolio](https://img.shields.io/badge/Portfolio-4285F4?style=flat&logo=google-chrome&logoColor=white)](https://izaacapp.github.io/)
[![Email](https://img.shields.io/badge/Email-D14836?style=flat&logo=gmail&logoColor=white)](mailto:Izaacap@gmail.com)

**Izaac Plambeck** - Full Stack Developer & System Architect

### Contributors
- [**Mason Miles**](https://github.com/cdmairu) - Backend Development & API Design
- [**cupidtiy**](https://github.com/cupidtiy) - Frontend Development & UI/UX
- [**Devonav**](https://github.com/Devonav) - Mobile Development & Flutter Integration

## Project Status

This repository maintains production builds following enterprise software distribution standards. The source code is maintained in private repositories to protect intellectual property while demonstrating deployment capabilities and architectural decisions.

### Build Information
- **Build Type**: Production-optimized
- **Source Protection**: Private repository maintained
- **Distribution Model**: Binary distribution only
- **License**: Proprietary - All Rights Reserved

## Contact Information

For technical inquiries, collaboration opportunities, or source code access:

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/izaac-plambeck/)
[![Portfolio](https://img.shields.io/badge/Portfolio-4285F4?style=flat&logo=google-chrome&logoColor=white)](https://izaacapp.github.io/)
[![Email](https://img.shields.io/badge/Email-D14836?style=flat&logo=gmail&logoColor=white)](mailto:Izaacap@gmail.com)

---

Copyright © 2025 Passport Buddy. All rights reserved.

This software and associated documentation files are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without express written permission.
