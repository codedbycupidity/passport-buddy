import { HttpResponse, http } from 'msw';
import { graphqlHandlers } from './graphqlHandlers';
import { demoUsers, demoPosts, demoFlights, demoNotifications, currentDemoUser, friendships } from './index';

// Current user state
let currentUser = currentDemoUser;
let authToken: string | null = null;

// Helper to log requests in demo mode
const logRequest = (method: string, url: string) => {
  console.log(`🎭 DEMO: ${method} ${url}`);
};

// Helper to get user by ID
const getUserById = (id: string) => demoUsers.find(u => u._id === id) || demoUsers[0];

export const handlers = [
  ...graphqlHandlers,
  
  // Auth endpoints
  http.post('*/api/auth/register', () => {
    logRequest('POST', '/api/auth/register');
    return HttpResponse.json({
      success: true,
      message: 'Registration successful',
      user: currentUser
    });
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    logRequest('POST', request.url);
    console.log('🎭 DEMO: Login request intercepted');
    
    const body = await request.json() as any;
    const email = body.email || body.emailOrUsername;
    const password = body.password;
    
    console.log('🎭 DEMO: Credentials received:', { email, password });
    
    if (email === 'demo@passport-buddy.com' && password === 'demo123') {
      authToken = 'demo-jwt-token';
      localStorage.setItem('passport_buddy_token', authToken);
      localStorage.setItem('passport_buddy_user', JSON.stringify(currentUser));
      
      return HttpResponse.json({
        status: 'success',
        success: true,
        token: authToken,
        refreshToken: 'demo-refresh-token',
        data: {
          user: currentUser
        },
        user: currentUser
      });
    } else {
      return HttpResponse.json({
        status: 'error',
        success: false,
        message: 'Invalid credentials. Use demo@passport-buddy.com / demo123'
      }, { status: 401 });
    }
  }),

  http.post('*/api/auth/logout', () => {
    logRequest('POST', '/api/auth/logout');
    authToken = null;
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  }),

  http.get('*/api/auth/verify', ({ request }) => {
    logRequest('GET', '/api/auth/verify');
    const authHeader = request.headers.get('Authorization');
    const token = localStorage.getItem('passport_buddy_token');
    
    if ((authHeader && authHeader.includes('demo-jwt-token')) || token === 'demo-jwt-token') {
      return HttpResponse.json({
        status: 'success',
        success: true,
        data: {
          user: currentUser
        },
        user: currentUser
      });
    }
    
    return HttpResponse.json({
      status: 'error',
      success: false,
      message: 'Not authenticated'
    }, { status: 401 });
  }),

  http.get('*/api/auth/user', ({ request }) => {
    logRequest('GET', '/api/auth/user');
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.includes('demo-jwt-token')) {
      return HttpResponse.json({
        status: 'success',
        success: true,
        data: {
          user: currentUser
        },
        user: currentUser
      });
    }
    
    return HttpResponse.json({
      status: 'error',
      success: false,
      message: 'Not authenticated'
    }, { status: 401 });
  }),

  // User endpoints
  http.get('*/api/users/:userId', ({ params }) => {
    const user = demoUsers.find(u => u._id === params.userId);
    return HttpResponse.json({
      success: true,
      user: user || demoUsers[0]
    });
  }),

  http.get('*/api/users/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    
    const results = demoUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return HttpResponse.json({
      success: true,
      users: results
    });
  }),

  // Post endpoints
  http.get('*/api/v1/posts/all', () => {
    logRequest('GET', '/api/v1/posts/all');
    console.log('🎭 DEMO: Returning', demoPosts.length, 'posts for feed');
    
    // Sort posts by creation date (newest first)
    const sortedPosts = [...demoPosts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Transform posts to have correct image structure
    const transformedPosts = sortedPosts.map(post => ({
      ...post,
      images: post.images ? post.images.map((img: any) => ({
        url: typeof img === 'string' ? img : img,
        key: 'demo-key',
        size: 1024,
        mimetype: 'image/jpeg'
      })) : []
    }));
    
    // Log the exact response structure
    const response = {
      status: 'success',
      success: true,
      data: {
        posts: transformedPosts
      },
      hasMore: false
    };
    
    console.log('🎭 DEMO: Response structure:', JSON.stringify(response, null, 2));
    console.log('🎭 DEMO: First post:', sortedPosts[0] ? {
      id: sortedPosts[0]._id,
      author: sortedPosts[0].author.username,
      avatar: sortedPosts[0].author.avatar,
      content: sortedPosts[0].content.substring(0, 50) + '...'
    } : 'No posts');
    
    // Log avatar URLs for debugging
    console.log('🎭 DEMO: Avatar URLs:', sortedPosts.slice(0, 3).map(p => ({
      username: p.author.username,
      avatar: p.author.avatar
    })));
    
    return HttpResponse.json(response);
  }),

  http.post('*/api/v1/posts', async ({ request }) => {
    const formData = await request.formData();
    const content = formData.get('content') as string;
    
    const newPost = {
      _id: Date.now().toString(),
      content,
      author: currentUser,
      images: [],
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    
    demoPosts.unshift(newPost);
    
    return HttpResponse.json({
      success: true,
      post: newPost
    });
  }),

  http.post('*/api/v1/posts/:postId/like', ({ params }) => {
    const post = demoPosts.find(p => p._id === params.postId);
    if (post) {
      const userIndex = post.likes.indexOf(currentUser._id);
      if (userIndex > -1) {
        post.likes.splice(userIndex, 1);
      } else {
        post.likes.push(currentUser._id);
      }
      
      return HttpResponse.json({
        success: true,
        post
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Post not found'
    }, { status: 404 });
  }),

  http.post('*/api/v1/posts/:postId/comment', async ({ request, params }) => {
    const { content } = await request.json() as any;
    const post = demoPosts.find(p => p._id === params.postId);
    
    if (post) {
      const newComment = {
        _id: Date.now().toString(),
        content,
        author: currentUser,
        createdAt: new Date().toISOString()
      };
      
      post.comments = post.comments || [];
      post.comments.push(newComment);
      
      return HttpResponse.json({
        success: true,
        comment: newComment
      });
    }
    
    return HttpResponse.json({
      success: false,
      message: 'Post not found'
    }, { status: 404 });
  }),

  // Flight endpoints
  http.get('*/api/flights', () => {
    return HttpResponse.json({
      success: true,
      flights: demoFlights
    });
  }),

  http.post('*/api/flights', async ({ request }) => {
    const flight = await request.json();
    
    const newFlight = {
      ...flight,
      _id: Date.now().toString(),
      user: currentUser._id
    };
    
    demoFlights.push(newFlight);
    
    return HttpResponse.json({
      success: true,
      flight: newFlight
    });
  }),

  // Notification endpoints
  http.get('*/api/notifications', () => {
    return HttpResponse.json({
      success: true,
      notifications: demoNotifications,
      unreadCount: demoNotifications.filter(n => !n.read).length
    });
  }),

  http.put('*/api/notifications/:notificationId/read', ({ params }) => {
    const notification = demoNotifications.find(n => n._id === params.notificationId);
    if (notification) {
      notification.read = true;
    }
    
    return HttpResponse.json({
      success: true
    });
  }),

  http.patch('*/api/v1/notifications/:notificationId/read', ({ params }) => {
    logRequest('PATCH', `/api/v1/notifications/${params.notificationId}/read`);
    const notification = demoNotifications.find(n => n._id === params.notificationId);
    if (notification) {
      notification.read = true;
    }
    
    return HttpResponse.json({
      success: true,
      message: 'Notification marked as read'
    });
  }),

  http.patch('*/api/v1/notifications/read-all', () => {
    logRequest('PATCH', '/api/v1/notifications/read-all');
    demoNotifications.forEach(n => n.read = true);
    
    return HttpResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });
  }),

  // Pexels proxy (for location images)
  http.get('*/api/pexels/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || 'travel';
    
    // Return some nice travel images
    return HttpResponse.json({
      photos: [
        {
          src: {
            medium: 'https://images.pexels.com/photos/2187605/pexels-photo-2187605.jpeg?w=600'
          }
        },
        {
          src: {
            medium: 'https://images.pexels.com/photos/731217/pexels-photo-731217.jpeg?w=600'
          }
        }
      ]
    });
  }),

  // Additional endpoints
  http.get('*/api/v1/flights/stats', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    logRequest('GET', `/api/v1/flights/stats?userId=${userId}`);
    
    return HttpResponse.json({
      success: true,
      stats: {
        totalFlights: 2,
        totalDistance: 12400,
        totalDuration: 24,
        topDestinations: ['Tokyo', 'Dubai'],
        airlines: { 'United Airlines': 1, 'Emirates': 1 }
      }
    });
  }),

  http.get('*/api/v1/flights/my-flights', () => {
    logRequest('GET', '/api/v1/flights/my-flights');
    return HttpResponse.json({
      success: true,
      flights: demoFlights
    });
  }),

  http.get('*/api/v1/notifications', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    logRequest('GET', `/api/v1/notifications?page=${page}&limit=${limit}`);
    
    return HttpResponse.json({
      success: true,
      notifications: demoNotifications,
      pagination: {
        page: page,
        pages: 1,
        total: demoNotifications.length,
        limit: limit
      },
      unreadCount: demoNotifications.filter(n => !n.read).length
    });
  }),

  http.get('*/api/v1/posts/user/:userId', ({ params }) => {
    logRequest('GET', `/api/v1/posts/user/${params.userId}`);
    const userPosts = demoPosts.filter(p => p.author._id === params.userId);
    
    // Transform posts to have correct image structure
    const transformedPosts = userPosts.map(post => ({
      ...post,
      images: post.images ? post.images.map((img: any) => ({
        url: typeof img === 'string' ? img : img,
        key: 'demo-key',
        size: 1024,
        mimetype: 'image/jpeg'
      })) : []
    }));
    
    return HttpResponse.json({
      success: true,
      posts: transformedPosts
    });
  }),

  http.get('*/api/v1/users/profile/:username', ({ params }) => {
    logRequest('GET', `/api/v1/users/profile/${params.username}`);
    const user = demoUsers.find(u => u.username === params.username);
    
    if (!user) {
      return HttpResponse.json({
        status: 'error',
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }
    
    // Add follower/following data
    const enrichedUser = {
      ...user,
      isFollowing: friendships.some(f => f.followerId === currentUser._id && f.followingId === user._id),
      isBlocked: false,
      followers: friendships.filter(f => f.followingId === user._id).map(f => getUserById(f.followerId)),
      following: friendships.filter(f => f.followerId === user._id).map(f => getUserById(f.followingId))
    };
    
    return HttpResponse.json({
      status: 'success',
      success: true,
      data: {
        user: enrichedUser
      }
    });
  }),

  http.get('*/api/v1/posts/bookmarked', () => {
    logRequest('GET', '/api/v1/posts/bookmarked');
    return HttpResponse.json({
      success: true,
      posts: [] // No bookmarked posts in demo
    });
  }),

  http.get('*/api/v1/users/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    logRequest('GET', `/api/v1/users/search?q=${query}`);
    
    const results = demoUsers.filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return HttpResponse.json({
      success: true,
      users: results
    });
  }),

  // Following/Friend endpoints
  http.get('*/api/v1/users/:userId/following', ({ params }) => {
    logRequest('GET', `/api/v1/users/${params.userId}/following`);
    
    const following = friendships
      .filter(f => f.followerId === params.userId)
      .map(f => demoUsers.find(u => u._id === f.followingId))
      .filter(Boolean);
    
    return HttpResponse.json({
      success: true,
      users: following
    });
  }),

  http.get('*/api/v1/users/:userId/followers', ({ params }) => {
    logRequest('GET', `/api/v1/users/${params.userId}/followers`);
    
    const followers = friendships
      .filter(f => f.followingId === params.userId)
      .map(f => demoUsers.find(u => u._id === f.followerId))
      .filter(Boolean);
    
    return HttpResponse.json({
      success: true,
      users: followers
    });
  }),

  http.post('*/api/v1/users/:userId/follow', ({ params }) => {
    logRequest('POST', `/api/v1/users/${params.userId}/follow`);
    
    // Add new friendship
    friendships.push({
      followerId: currentUser._id,
      followingId: params.userId as string
    });
    
    return HttpResponse.json({
      success: true,
      message: 'Now following user'
    });
  }),

  http.delete('*/api/v1/users/:userId/follow', ({ params }) => {
    logRequest('DELETE', `/api/v1/users/${params.userId}/follow`);
    
    // Remove friendship
    const index = friendships.findIndex(
      f => f.followerId === currentUser._id && f.followingId === params.userId
    );
    
    if (index > -1) {
      friendships.splice(index, 1);
    }
    
    return HttpResponse.json({
      success: true,
      message: 'Unfollowed user'
    });
  }),

  http.get('*/api/v1/users/:userId/is-following', ({ params }) => {
    logRequest('GET', `/api/v1/users/${params.userId}/is-following`);
    
    const isFollowing = friendships.some(
      f => f.followerId === currentUser._id && f.followingId === params.userId
    );
    
    return HttpResponse.json({
      success: true,
      isFollowing
    });
  }),

  // Bookmark endpoints
  http.get('*/api/v1/posts/:postId/bookmark/status', ({ params }) => {
    logRequest('GET', `/api/v1/posts/${params.postId}/bookmark/status`);
    
    return HttpResponse.json({
      success: true,
      isBookmarked: false
    });
  }),

  http.post('*/api/v1/posts/:postId/bookmark', ({ params }) => {
    logRequest('POST', `/api/v1/posts/${params.postId}/bookmark`);
    
    return HttpResponse.json({
      success: true,
      message: 'Post bookmarked'
    });
  }),

  http.delete('*/api/v1/posts/:postId/bookmark', ({ params }) => {
    logRequest('DELETE', `/api/v1/posts/${params.postId}/bookmark`);
    
    return HttpResponse.json({
      success: true,
      message: 'Bookmark removed'
    });
  }),

  // OCR/Boarding Pass Upload endpoint
  http.post('*/api/v1/flights/upload-boarding-pass', async () => {
    logRequest('POST', '/api/v1/flights/upload-boarding-pass');
    
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return simulated OCR results
    return HttpResponse.json({
      success: true,
      message: 'Boarding pass processed successfully',
      data: {
        airline: 'Demo Airlines',
        flightNumber: 'DM123',
        departure: {
          airport: 'JFK',
          city: 'New York',
          time: '2025-08-15T14:30:00Z',
          terminal: '4',
          gate: 'B12'
        },
        arrival: {
          airport: 'LAX',
          city: 'Los Angeles',
          time: '2025-08-15T17:45:00Z',
          terminal: '2',
          gate: 'A5'
        },
        passenger: {
          name: 'Beck Johnson',
          seatNumber: '12A',
          boardingGroup: 'A',
          confirmationCode: 'DEMO123'
        },
        class: 'Economy',
        aircraft: 'Boeing 737-800',
        distance: 2475,
        duration: '5h 15m',
        extractedText: 'BOARDING PASS\nDEMO AIRLINES\nFlight: DM123\nFrom: JFK (New York)\nTo: LAX (Los Angeles)\nDeparture: Aug 15, 2025 14:30\nPassenger: BECK JOHNSON\nSeat: 12A\nGate: B12\nBoarding Group: A'
      }
    });
  })
];