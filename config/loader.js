const path = require('path');
const fs = require('fs');
const { validateConfig } = require('./validation');

/**
 * Configuration loader with environment support
 */
class ConfigLoader {
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
    this.config = null;
  }

  /**
   * Load configuration for current environment
   */
  load() {
    if (this.config) {
      return this.config;
    }

    // Load base configuration
    const baseConfig = this.loadEnvFile('.env');
    
    // Load environment-specific configuration
    const envConfig = this.loadEnvFile(`.env.${this.env}`);
    
    // Merge configurations (env-specific overrides base)
    const mergedConfig = {
      ...baseConfig,
      ...envConfig,
      ...process.env // Command-line overrides everything
    };

    // Validate merged configuration
    this.config = validateConfig(mergedConfig);
    
    return this.config;
  }

  /**
   * Load and parse environment file
   */
  loadEnvFile(filename) {
    const filepath = path.join(process.cwd(), filename);
    
    if (!fs.existsSync(filepath)) {
      console.log(`⚠️  No ${filename} file found`);
      return {};
    }

    const env = {};
    const content = fs.readFileSync(filepath, 'utf8');
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
    });

    return env;
  }

  /**
   * Get specific configuration value
   */
  get(key, defaultValue = undefined) {
    if (!this.config) {
      this.load();
    }
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Get all configuration
   */
  getAll() {
    if (!this.config) {
      this.load();
    }
    return { ...this.config };
  }

  /**
   * Check if running in production
   */
  isProduction() {
    return this.env === 'production';
  }

  /**
   * Check if running in development
   */
  isDevelopment() {
    return this.env === 'development';
  }

  /**
   * Get database configuration
   */
  getDatabaseConfig() {
    return {
      uri: this.get('MONGO_URI'),
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: this.get('DB_POOL_SIZE', 10),
        serverSelectionTimeoutMS: this.get('DB_TIMEOUT', 5000)
      }
    };
  }

  /**
   * Get authentication configuration
   */
  getAuthConfig() {
    return {
      jwt: {
        secret: this.get('JWT_SECRET'),
        expiresIn: this.get('JWT_EXPIRES_IN', '7d')
      },
      bcrypt: {
        saltRounds: this.get('BCRYPT_ROUNDS', 10)
      }
    };
  }

  /**
   * Get email configuration
   */
  getEmailConfig() {
    const service = this.get('EMAIL_SERVICE', 'resend');
    
    const configs = {
      resend: {
        apiKey: this.get('RESEND_API_KEY'),
        from: this.get('EMAIL_FROM', 'noreply@passportbuddy.com')
      },
      smtp: {
        host: this.get('SMTP_HOST'),
        port: this.get('SMTP_PORT', 587),
        secure: this.get('SMTP_SECURE', false),
        auth: {
          user: this.get('SMTP_USER'),
          pass: this.get('SMTP_PASS')
        }
      }
    };

    return {
      service,
      ...configs[service]
    };
  }

  /**
   * Get storage configuration
   */
  getStorageConfig() {
    return {
      spaces: {
        accessKeyId: this.get('DO_SPACES_KEY'),
        secretAccessKey: this.get('DO_SPACES_SECRET'),
        endpoint: this.get('DO_SPACES_ENDPOINT'),
        bucket: this.get('DO_SPACES_BUCKET'),
        region: this.get('DO_SPACES_REGION', 'nyc3')
      },
      upload: {
        maxFileSize: this.get('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
        allowedMimeTypes: this.get('ALLOWED_MIME_TYPES', 'image/*,video/*').split(',')
      }
    };
  }

  /**
   * Get CORS configuration
   */
  getCorsConfig() {
    const origins = this.get('CORS_ORIGINS', '*');
    
    return {
      origin: origins === '*' ? true : origins.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: this.parseTimeString(this.get('RATE_LIMIT_WINDOW', '15m')),
      max: this.get('RATE_LIMIT_MAX', 100),
      message: 'Too many requests, please try again later.'
    };
  }

  /**
   * Parse time string to milliseconds
   */
  parseTimeString(timeStr) {
    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time string: ${timeStr}`);
    }
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }
}

// Export singleton instance
module.exports = new ConfigLoader();