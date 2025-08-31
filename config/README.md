# Configuration Management

This directory contains all configuration files for the Passport Buddy application.

## Directory Structure

```
config/
├── environments/        # Environment-specific configurations
│   ├── development/    # Development environment configs
│   ├── staging/        # Staging environment configs
│   └── production/     # Production environment configs
├── services/           # Service-specific configurations
│   ├── nginx/         # Nginx configurations
│   ├── docker/        # Docker configurations
│   └── database/      # Database configurations
├── infrastructure/     # Infrastructure as Code
│   ├── digitalocean/  # DigitalOcean configurations
│   └── monitoring/    # Monitoring configurations
├── ci-cd/             # CI/CD configurations
│   └── jenkins/       # Jenkins pipelines
└── templates/         # Configuration templates
    └── env/          # Environment variable templates
```

## Configuration Files

### Environment Variables
- `.env.example` - Template for environment variables
- `.env.dev` - Development environment variables
- `.env.staging` - Staging environment variables
- `.env.prod` - Production environment variables

### Application Configs
- `app.config.js` - Main application configuration
- `database.config.js` - Database connection settings
- `auth.config.js` - Authentication settings
- `storage.config.js` - File storage settings
- `email.config.js` - Email service settings

### Service Configs
- `nginx/` - Nginx server configurations
- `docker/` - Docker and Docker Compose files
- `jenkins/` - CI/CD pipeline configurations

## Environment Variables

### Required Variables

#### Backend
```bash
# Database
MONGO_URI=mongodb://localhost:27017/passport_buddy
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Email Service
EMAIL_SERVICE=resend
RESEND_API_KEY=your-resend-key

# Storage
DO_SPACES_KEY=your-spaces-key
DO_SPACES_SECRET=your-spaces-secret
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_BUCKET=passport-buddy

# API Keys
PEXELS_API_KEY=your-pexels-key
```

#### Frontend
```bash
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_GRAPHQL_URL=http://localhost:3000/graphql

# Feature Flags
VITE_ENABLE_SOCIAL=true
VITE_ENABLE_FLIGHTS=true
VITE_ENABLE_ANALYTICS=false
```

### Optional Variables
```bash
# Development
DEBUG=true
LOG_LEVEL=debug

# Performance
NODE_ENV=production
CLUSTER_MODE=true
WORKERS=4

# Security
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
CORS_ORIGINS=https://app.passportbuddy.com
```

## Configuration Validation

All configurations are validated at startup using the validation schema in `config/validation/`.

### Validation Rules
1. Required environment variables must be present
2. URLs must be valid
3. Numeric values must be within acceptable ranges
4. API keys must match expected formats

### Running Validation
```bash
# Validate current environment
npm run validate:config

# Validate specific environment
npm run validate:config -- --env=production
```

## Best Practices

1. **Never commit secrets** - Use `.env.example` as template
2. **Use environment-specific files** - Separate configs for dev/staging/prod
3. **Validate early** - Check configs at application startup
4. **Document changes** - Update this README when adding new configs
5. **Use defaults wisely** - Provide sensible defaults for optional configs

## Migration Guide

When adding new configuration:

1. Add to `.env.example` with description
2. Update validation schema
3. Add to relevant config file
4. Update this documentation
5. Test in all environments

## Security Notes

- All `.env` files are gitignored
- Secrets are stored in environment variables only
- Production secrets are managed through CI/CD
- Regular rotation of sensitive keys is recommended