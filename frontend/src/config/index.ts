/**
 * Frontend Configuration Management
 * 
 * This module provides type-safe access to environment variables
 * and configuration settings for the frontend application.
 */

interface AppConfig {
  // API Configuration
  apiUrl: string;
  graphqlUrl: string;
  
  // Feature Flags
  features: {
    social: boolean;
    flights: boolean;
    analytics: boolean;
    devMode: boolean;
  };
  
  // Authentication
  auth: {
    tokenKey: string;
    userKey: string;
    refreshInterval: number;
  };
  
  // Upload Configuration
  upload: {
    maxFileSize: number;
    acceptedImageTypes: string[];
    acceptedVideoTypes: string[];
  };
  
  // UI Configuration
  ui: {
    theme: 'light' | 'dark' | 'auto';
    animationsEnabled: boolean;
    infiniteScrollThreshold: number;
  };
}

class Config {
  private static instance: Config;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  private loadConfig(): AppConfig {
    // Load from import.meta.env (Vite)
    const env = import.meta.env;
    
    return {
      // API Configuration
      apiUrl: env.VITE_API_URL || 'http://localhost:3000',
      graphqlUrl: env.VITE_GRAPHQL_URL || 'http://localhost:3000/graphql',
      
      // Feature Flags
      features: {
        social: env.VITE_ENABLE_SOCIAL !== 'false',
        flights: env.VITE_ENABLE_FLIGHTS !== 'false',
        analytics: env.VITE_ENABLE_ANALYTICS === 'true',
        devMode: env.DEV || false
      },
      
      // Authentication
      auth: {
        tokenKey: env.VITE_AUTH_TOKEN_KEY || 'passport_buddy_token',
        userKey: env.VITE_AUTH_USER_KEY || 'passport_buddy_user',
        refreshInterval: parseInt(env.VITE_AUTH_REFRESH_INTERVAL || '3600000') // 1 hour
      },
      
      // Upload Configuration
      upload: {
        maxFileSize: parseInt(env.VITE_MAX_FILE_SIZE || '10485760'), // 10MB
        acceptedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        acceptedVideoTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo']
      },
      
      // UI Configuration
      ui: {
        theme: (env.VITE_THEME || 'auto') as 'light' | 'dark' | 'auto',
        animationsEnabled: env.VITE_ANIMATIONS_ENABLED !== 'false',
        infiniteScrollThreshold: parseInt(env.VITE_INFINITE_SCROLL_THRESHOLD || '200')
      }
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];
    
    // Validate required fields
    if (!this.config.apiUrl) {
      errors.push('API URL is required');
    }
    
    if (!this.config.graphqlUrl) {
      errors.push('GraphQL URL is required');
    }
    
    // Validate URLs
    try {
      new URL(this.config.apiUrl);
    } catch {
      errors.push('Invalid API URL');
    }
    
    try {
      new URL(this.config.graphqlUrl);
    } catch {
      errors.push('Invalid GraphQL URL');
    }
    
    // Validate numeric values
    if (this.config.upload.maxFileSize <= 0) {
      errors.push('Max file size must be positive');
    }
    
    if (this.config.auth.refreshInterval <= 0) {
      errors.push('Auth refresh interval must be positive');
    }
    
    if (errors.length > 0) {
      console.error('Configuration validation failed:', errors);
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getApiUrl(endpoint?: string): string {
    const baseUrl = this.config.apiUrl;
    if (!endpoint) return baseUrl;
    
    // Ensure proper URL joining
    const url = new URL(baseUrl);
    url.pathname = url.pathname.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');
    return url.toString();
  }

  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  isDevelopment(): boolean {
    return this.config.features.devMode;
  }

  isProduction(): boolean {
    return !this.isDevelopment();
  }

  getUploadConstraints() {
    return {
      maxSize: this.config.upload.maxFileSize,
      acceptedTypes: [
        ...this.config.upload.acceptedImageTypes,
        ...this.config.upload.acceptedVideoTypes
      ],
      isImage: (type: string) => this.config.upload.acceptedImageTypes.includes(type),
      isVideo: (type: string) => this.config.upload.acceptedVideoTypes.includes(type)
    };
  }

  getAuthConfig() {
    return { ...this.config.auth };
  }

  getUIConfig() {
    return { ...this.config.ui };
  }

  // Helper method to get all config (for debugging)
  getAllConfig(): Readonly<AppConfig> {
    return Object.freeze({ ...this.config });
  }
}

// Export singleton instance
export const config = Config.getInstance();

// Export types
export type { AppConfig };

// Export specific getters for common use cases
export const getApiUrl = (endpoint?: string) => config.getApiUrl(endpoint);
export const isFeatureEnabled = (feature: keyof AppConfig['features']) => 
  config.isFeatureEnabled(feature);
export const isDevelopment = () => config.isDevelopment();
export const isProduction = () => config.isProduction();