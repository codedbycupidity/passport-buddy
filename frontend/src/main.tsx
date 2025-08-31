// web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ApolloProvider, gql } from '@apollo/client';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { client } from './config/apolloClient';

// Enable mocking for demo mode
async function enableMocking() {
  // Only enable demo mode if explicitly set in environment
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  
  // Allow URL param override only in non-production environments
  const urlParams = new URLSearchParams(window.location.search);
  const urlDemoOverride = urlParams.get('demo');
  
  if (import.meta.env.DEV && urlDemoOverride !== null) {
    // In dev, allow ?demo=true or ?demo=false to override
    if (urlDemoOverride === 'true' && !isDemoMode) {
      console.log('🎭 Demo mode enabled via URL param');
      localStorage.setItem('demoMode', 'true');
      // Reload to apply demo environment
      window.location.href = window.location.href.replace('?demo=true', '');
      return;
    } else if (urlDemoOverride === 'false' && isDemoMode) {
      console.log('🎭 Demo mode disabled via URL param');
      localStorage.removeItem('demoMode');
      // Reload to apply normal environment
      window.location.href = window.location.href.replace('?demo=false', '');
      return;
    }
  }
  
  if (!isDemoMode) {
    console.log('🚀 Running in', import.meta.env.VITE_ENVIRONMENT || 'development', 'mode');
    return;
  }

  console.log('🎭 Demo mode enabled! Loading MSW...');
  
  const { worker } = await import('./demo/browser');
  
  // Start the worker
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js'
    }
  });
  
  console.log('🎭 MSW started successfully');
  
  // Set a flag for demo mode
  (window as any).__DEMO_MODE__ = true;
}

// Always wait for mocking setup to complete before rendering
async function startApp() {
  await enableMocking();
  
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ApolloProvider client={client}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ApolloProvider>
    </React.StrictMode>
  );
}

startApp();

// Dev tools for console
if (import.meta.env.DEV) {
  // Import stress test
  import('./utils/stressTest').then(({ stressTest }) => {
    (window as any).runStressTest = async (type: string = 'help') => {
      console.log('🧪 Passport Buddy Stress Test Console');

      if (type === 'help') {
        console.log('\nAvailable commands:');
        console.log('  runStressTest("likes")     - Test concurrent likes');
        console.log('  runStressTest("comments")  - Test concurrent comments');
        console.log('  runStressTest("mixed")     - Test mixed operations');
        console.log('  runStressTest("rapid")     - Test rapid fire likes');
        console.log('  runStressTest("auth")      - Test authentication');
        return;
      }

      // Simple query to get posts from cache
      const GET_POSTS = gql`
        query GetPosts {
          posts {
            _id
          }
        }
      `;
      const posts = client.cache.readQuery({ query: GET_POSTS })?.posts;
      if (!posts?.length) {
        console.error('No posts available for testing. Create some posts first!');
        return;
      }

      stressTest.reset();
      const firstPostId = posts[0]._id;
      const postIds = posts.map((p: any) => p._id);

      switch (type) {
        case 'likes':
          await stressTest.runConcurrentLikeTest(firstPostId, 20);
          break;
        case 'comments':
          await stressTest.runConcurrentCommentTest(firstPostId, 15);
          break;
        case 'mixed':
          await stressTest.runMixedOperationsTest(postIds, 30);
          break;
        case 'rapid':
          await stressTest.runRapidFireTest(firstPostId, 3000);
          break;
        case 'auth':
          await stressTest.runAuthenticationStressTest(5);
          break;
        default:
          console.error('Unknown test type. Use runStressTest("help") for options.');
      }
    };
  });

  // Import seed data
  import('./utils/seedTestData').then(({ seedTestData }) => {
    (window as any).seedTestData = seedTestData;
  });

  // Log available dev tools
  console.log('🛠️ Passport Buddy Dev Tools loaded!');
  console.log('Available commands:');
  console.log('  seedTestData()         - Create test posts and comments');
  console.log('  runStressTest("help")  - Show stress test options');
}
