# Scripts Directory

All project scripts organized by category for easy maintenance and discovery.

## 📁 Directory Structure

### 🌱 **seed/** - Database Seeding
- `seed.ts` - Main database seeding script
- `seed-social-edge-cases.ts` - Social media edge case data
- `seed-test-users.ts` - Test user generation
- `create-social-feed.ts` - Social feed content generation

### 🔄 **migration/** - Data Migration
- `migrate-image-urls.ts` - Image URL migration script

### 🗄️ **database/** - Database Management
- `fix-db.js` - Database repair utilities
- `mongo-init.js` - MongoDB initialization

### 🧪 **testing/** - Testing Utilities
- `stress-test.js` - Application stress testing
- `test-responsive.js` - Responsive design testing

### 🛠️ **development/** - Development Tools
- `validateDurations.ts` - Flight duration validation
- `add-health-check.js` - Health check utilities

### 🚀 **deployment/** - Deployment Scripts
- `deploy.sh` - Main deployment script

### 📱 **mobile/** - Mobile Development
- `run-dev.sh` - Development environment
- `run-local.sh` - Local testing
- `run.sh` - Production build
- `setup-flutter.sh` - Flutter setup
- `setup-mobile.sh` - Mobile environment setup
- `test_connection.dart` - Connection testing

## 🎯 Usage

### Backend Scripts (from backend/ directory)
```bash
npm run seed              # Main seeding
npm run seed:edge         # Edge case data
npm run seed:users        # Test users
npm run seed:social       # Social feed
npm run migrate:urls      # Image migration
```

### Direct Execution
```bash
# Database
node scripts/database/fix-db.js
node scripts/database/mongo-init.js

# Testing
node scripts/testing/stress-test.js
./scripts/testing/test-responsive.js

# Development
ts-node scripts/development/validateDurations.ts
node scripts/development/add-health-check.js

# Deployment
./scripts/deployment/deploy.sh

# Mobile
./scripts/mobile/setup-mobile.sh
./scripts/mobile/run-dev.sh
```

## 📋 Legacy Directories

The following directories are preserved for existing functionality:
- `backup/` - Backup utilities
- `deploy/` - Legacy deployment files
- `health-checks/` - Health monitoring
- `secrets/` - Secret management
- `setup/` - Environment setup

## 🧹 Maintenance

- All scripts follow consistent naming conventions
- TypeScript scripts use `.ts` extension
- Shell scripts are executable with proper shebangs
- Each script category has clear separation of concerns