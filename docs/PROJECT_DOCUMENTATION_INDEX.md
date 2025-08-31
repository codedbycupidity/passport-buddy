# Passport Buddy - Complete Documentation Index

## 📚 Documentation Overview

This index provides a comprehensive overview of all documentation for the Passport Buddy social travel platform. The project is organized with a legacy code mindset for long-term maintenance.

---

## 🏗️ Architecture & Structure

### Core Documentation
- [`README.md`](../README.md) - Main project overview and quickstart guide
- [`docs/PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) - Complete project structure documentation
- [`docs/PROJECT_TREE.md`](./PROJECT_TREE.md) - Visual project structure with emojis
- [`docs/ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) - Complete env var reference
- [`documentation/CURRENT_APP_STATE.md`](../documentation/CURRENT_APP_STATE.md) - Current feature status

### Backend Documentation
- [`backend/README.md`](../backend/README.md) - Backend API overview and setup
- [`docs/API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) - Complete REST & GraphQL API reference

### Frontend Documentation
- [`frontend/README.md`](../frontend/README.md) - Frontend React app documentation

### Mobile Documentation
- [`mobile/README.md`](../mobile/README.md) - Flutter mobile app documentation
- [`mobile/BUILD_CONFIGURATION.md`](../mobile/BUILD_CONFIGURATION.md) - Mobile build configuration

---

## 🚀 Development & Deployment

### Development Guides
- [`docs/DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) - Complete development workflow
- [`docs/ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md) - Comprehensive environment setup guide
- [`documentation/QUICK_START_NEXT_SESSION.md`](../documentation/QUICK_START_NEXT_SESSION.md) - Quick start for new sessions

### Deployment & Production
- [`docs/DEPLOYMENT_DOCUMENTATION.md`](./DEPLOYMENT_DOCUMENTATION.md) - Complete deployment guide
- [`docs/PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md) - Production-specific deployment
- [`docs/JENKINS_CREDENTIALS.md`](./JENKINS_CREDENTIALS.md) - CI/CD configuration

---

## 🔍 Testing & Quality

### Testing Documentation
- [`docs/TEST_REPORT.md`](./TEST_REPORT.md) - Comprehensive testing documentation
- [`docs/MOBILE_TESTING.md`](./MOBILE_TESTING.md) - Mobile app testing guide

### Performance & Optimization
- [`docs/PERFORMANCE_OPTIMIZATIONS.md`](./PERFORMANCE_OPTIMIZATIONS.md) - Performance optimization strategies

---

## 🛡️ Technical Standards & Guidelines

### Time Handling Standards
- [`backend/ZERO_TOLERANCE_TIME_HANDLING.md`](../backend/ZERO_TOLERANCE_TIME_HANDLING.md) - Strict time handling rules

### Feature-Specific Documentation
- [`backend/src/utils/BOARDING_PASS_VALIDATION.md`](../backend/src/utils/BOARDING_PASS_VALIDATION.md) - OCR validation for boarding passes
- [`documentation/EARTH_VISUALIZATION_SESSION.md`](../documentation/EARTH_VISUALIZATION_SESSION.md) - Earth visualization feature

---

## 🔧 Troubleshooting & Support

- [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) - Common issues and solutions
- [`docs/PROJECT_ROADMAP.txt`](./PROJECT_ROADMAP.txt) - Project roadmap and progress

---

## 📊 Project Status

- [`documentation/CURRENT_APP_STATE.md`](../documentation/CURRENT_APP_STATE.md) - Current application state
- [`docs/PROJECT_TREE.md`](./PROJECT_TREE.md) - Visual project tree structure
- [`docs/PROJECT_ROADMAP.txt`](./PROJECT_ROADMAP.txt) - Development roadmap

---

## 🔐 Security & Configuration

- [`docs/ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) - Environment variable security
- [`docs/archive/ENV_STRUCTURE.md`](./archive/ENV_STRUCTURE.md) - Environment structure guide (archived)
- [`.editorconfig`](../.editorconfig) - Code style configuration
- [`.eslintrc.stress-test.js`](../.eslintrc.stress-test.js) - ESLint configuration
- [`.prettierrc.stress-test.json`](../.prettierrc.stress-test.json) - Prettier configuration

---

## 📝 Quick Reference

### Key Technologies
- **Backend**: Node.js, Express, MongoDB, GraphQL, TypeScript
- **Frontend**: React, TypeScript, Apollo Client, Vite
- **Mobile**: Flutter, Dart
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **File Storage**: AWS S3 / Cloudinary
- **Testing**: Jest, Vitest

### Important Commands
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev

# Mobile
cd mobile && flutter run

# Run all tests
npm test
```

### Repository Structure
```
passport-buddy/
├── backend/          # Node.js/Express API
├── frontend/         # React web app
├── mobile/           # Flutter mobile app
├── shared/           # Shared types and utilities
├── docs/             # Main documentation
├── documentation/    # Additional docs
├── scripts/          # Build and utility scripts
└── config/           # Configuration files
```

---

Last Updated: January 2025