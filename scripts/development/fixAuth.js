// Quick authentication debugging script
const http = require('http');

console.log('🔍 Testing authentication endpoints...\n');

// Test backend health
const testBackend = () => {
  return new Promise((resolve) => {
    http.get('http://localhost:3000/api/health', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Backend health check: OK');
        resolve(true);
      } else {
        console.log('❌ Backend health check failed:', res.statusCode);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log('❌ Backend not accessible:', err.message);
      resolve(false);
    });
  });
};

// Test auth endpoint
const testAuth = () => {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      fullName: 'Test User',
      email: 'test@example.com',
      username: 'testuser123',
      password: 'Test123!',
      passwordConfirm: 'Test123!'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n📝 Signup endpoint test:');
        console.log('   Status:', res.statusCode);
        console.log('   Response:', data);
        resolve(res.statusCode < 500);
      });
    });

    req.on('error', (err) => {
      console.log('❌ Auth endpoint error:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

// Run tests
async function runTests() {
  const backendOk = await testBackend();
  
  if (!backendOk) {
    console.log('\n⚠️  Backend is not running!');
    console.log('Run: cd backend && npm run dev');
    return;
  }

  await testAuth();

  console.log('\n📋 Troubleshooting tips:');
  console.log('1. Check MongoDB is running: brew services list | grep mongodb');
  console.log('2. Check .env files exist in both backend and frontend');
  console.log('3. Ensure CORS is configured correctly');
  console.log('4. Check browser console for detailed errors');
}

runTests();