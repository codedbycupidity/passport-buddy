#!/usr/bin/env node

// Health Monitor for Passport Buddy
// Continuously checks service health and alerts on issues

const http = require('http');
const { exec } = require('child_process');

const SERVICES = {
  backend: {
    name: 'Backend API',
    url: 'http://localhost:3000/api/health',
    critical: true
  },
  frontend: {
    name: 'Frontend',
    url: 'http://localhost:3001/',
    critical: true
  },
  mongodb: {
    name: 'MongoDB',
    check: () => checkMongoDB(),
    critical: true
  }
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Check HTTP service
async function checkHTTP(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

// Check MongoDB
async function checkMongoDB() {
  return new Promise((resolve) => {
    exec('docker exec mernflutter-mongo-1 mongosh -u root -p pass --authenticationDatabase admin --eval "db.adminCommand(\'ping\')" 2>/dev/null', (error) => {
      resolve(!error);
    });
  });
}

// Run health checks
async function runHealthChecks() {
  console.clear();
  console.log(`${colors.blue}=== Passport Buddy Health Monitor ===${colors.reset}`);
  console.log(`Time: ${new Date().toLocaleTimeString()}\n`);

  let allHealthy = true;

  for (const [key, service] of Object.entries(SERVICES)) {
    let isHealthy;
    
    if (service.url) {
      isHealthy = await checkHTTP(service.url);
    } else if (service.check) {
      isHealthy = await service.check();
    }

    const status = isHealthy ? 
      `${colors.green}✅ HEALTHY${colors.reset}` : 
      `${colors.red}❌ DOWN${colors.reset}`;
    
    console.log(`${service.name}: ${status}`);
    
    if (!isHealthy && service.critical) {
      allHealthy = false;
    }
  }

  if (!allHealthy) {
    console.log(`\n${colors.red}⚠️  Some services are down!${colors.reset}`);
    console.log(`Run: ${colors.yellow}./scripts/development/dev-manager.sh restart${colors.reset}`);
  } else {
    console.log(`\n${colors.green}✅ All services healthy${colors.reset}`);
  }

  // Check specific endpoints
  console.log(`\n${colors.blue}Endpoint Tests:${colors.reset}`);
  
  // Test signup endpoint
  const signupHealthy = await checkHTTP('http://localhost:3000/api/auth/signup');
  console.log(`Auth Signup: ${signupHealthy ? '✅' : '❌'}`);
  
  // Test GraphQL
  const graphqlHealthy = await checkHTTP('http://localhost:3000/graphql');
  console.log(`GraphQL: ${graphqlHealthy ? '✅' : '❌'}`);
}

// Continuous monitoring
if (process.argv[2] === '--watch') {
  console.log('Starting continuous health monitoring...');
  setInterval(runHealthChecks, 5000); // Check every 5 seconds
  runHealthChecks(); // Initial run
} else {
  // Single run
  runHealthChecks().then(() => {
    process.exit(0);
  });
}