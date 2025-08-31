const Joi = require('joi');
const fs = require('fs');
const path = require('path');

// Configuration schema
const configSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),

  // Backend Configuration
  PORT: Joi.number().port().default(3000),
  
  // Database
  MONGO_URI: Joi.string().uri().required()
    .description('MongoDB connection string'),
  REDIS_URL: Joi.string().uri().optional()
    .description('Redis connection string for caching'),

  // Authentication
  JWT_SECRET: Joi.string().min(32).required()
    .description('Secret key for JWT token generation'),
  JWT_EXPIRES_IN: Joi.string().default('7d')
    .description('JWT token expiration time'),
  
  // Email Service
  EMAIL_SERVICE: Joi.string()
    .valid('resend', 'smtp', 'sendgrid')
    .default('resend'),
  RESEND_API_KEY: Joi.when('EMAIL_SERVICE', {
    is: 'resend',
    then: Joi.string().required(),
    otherwise: Joi.optional()
  }),
  
  // Storage
  DO_SPACES_KEY: Joi.string().required()
    .description('DigitalOcean Spaces access key'),
  DO_SPACES_SECRET: Joi.string().required()
    .description('DigitalOcean Spaces secret key'),
  DO_SPACES_ENDPOINT: Joi.string().uri().required()
    .description('DigitalOcean Spaces endpoint URL'),
  DO_SPACES_BUCKET: Joi.string().required()
    .description('DigitalOcean Spaces bucket name'),
  
  // External APIs
  PEXELS_API_KEY: Joi.string().optional()
    .description('Pexels API key for stock photos'),
  
  // Frontend Configuration (VITE_ prefix)
  VITE_API_URL: Joi.string().uri().default('http://localhost:3000'),
  VITE_GRAPHQL_URL: Joi.string().uri().default('http://localhost:3000/graphql'),
  
  // Feature Flags
  VITE_ENABLE_SOCIAL: Joi.boolean().default(true),
  VITE_ENABLE_FLIGHTS: Joi.boolean().default(true),
  VITE_ENABLE_ANALYTICS: Joi.boolean().default(false),
  
  // Security
  CORS_ORIGINS: Joi.string().default('*')
    .description('Allowed CORS origins'),
  RATE_LIMIT_WINDOW: Joi.string().default('15m')
    .description('Rate limiting window'),
  RATE_LIMIT_MAX: Joi.number().default(100)
    .description('Maximum requests per window'),
  
  // Performance
  CLUSTER_MODE: Joi.boolean().default(false),
  WORKERS: Joi.number().min(1).default(4),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  DEBUG: Joi.boolean().default(false)
});

/**
 * Validate configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validated configuration
 * @throws {Error} If validation fails
 */
function validateConfig(config = process.env) {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => {
      return `  - ${detail.path.join('.')}: ${detail.message}`;
    }).join('\n');
    
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return value;
}

/**
 * Load and validate environment file
 * @param {string} envFile - Path to environment file
 * @returns {Object} Validated configuration
 */
function loadEnvFile(envFile) {
  if (!fs.existsSync(envFile)) {
    throw new Error(`Environment file not found: ${envFile}`);
  }

  // Parse env file
  const envContent = fs.readFileSync(envFile, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return validateConfig(env);
}

/**
 * Generate example environment file
 */
function generateEnvExample() {
  const example = [];
  
  example.push('# Passport Buddy Environment Configuration');
  example.push('# Generated from configuration schema');
  example.push('');
  
  const { value: schema } = configSchema.describe();
  
  Object.entries(schema.keys).forEach(([key, def]) => {
    if (def.flags && def.flags.description) {
      example.push(`# ${def.flags.description}`);
    }
    
    let value = '';
    if (def.flags && def.flags.default !== undefined) {
      value = def.flags.default;
    } else if (def.type === 'string') {
      value = 'your-value-here';
    } else if (def.type === 'number') {
      value = '0';
    } else if (def.type === 'boolean') {
      value = 'false';
    }
    
    const required = def.flags && def.flags.presence === 'required' ? ' (required)' : '';
    example.push(`${key}=${value}${required}`);
    example.push('');
  });
  
  return example.join('\n');
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'validate':
        const envFile = args[1] || '.env';
        const config = loadEnvFile(envFile);
        console.log('✅ Configuration is valid!');
        break;
        
      case 'generate':
        const example = generateEnvExample();
        const outputFile = args[1] || '.env.example';
        fs.writeFileSync(outputFile, example);
        console.log(`✅ Generated ${outputFile}`);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node config/validation/index.js validate [env-file]');
        console.log('  node config/validation/index.js generate [output-file]');
    }
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
}

module.exports = {
  validateConfig,
  loadEnvFile,
  generateEnvExample,
  configSchema
};