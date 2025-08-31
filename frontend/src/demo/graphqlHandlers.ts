import { graphql, HttpResponse } from 'msw';

// Reuse data from REST handlers
import { demoPosts, demoUsers, demoFlights, demoNotifications } from './index';

export const graphqlHandlers = [
  graphql.query('GetPosts', () => {
    console.log('🎭 DEMO: GraphQL GetPosts query intercepted');
    console.log('🎭 DEMO: Returning', demoPosts.length, 'posts');
    
    // Sort posts by creation date (newest first)
    const sortedPosts = [...demoPosts].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return HttpResponse.json({
      data: {
        posts: sortedPosts.map(post => ({
          ...post,
          images: post.images ? post.images.map((img: any) => ({
            url: typeof img === 'string' ? img : img, // Handle both string URLs and imported images
            key: 'demo-key',
            size: 1024,
            mimetype: 'image/jpeg'
          })) : [],
          likes: post.likes || [],
          comments: post.comments || []
        }))
      }
    });
  }),

  graphql.query('GetUserProfile', ({ variables }) => {
    console.log('🎭 DEMO: GraphQL GetUserProfile query intercepted', variables);
    const user = demoUsers.find(u => u.username === variables.username) || demoUsers[0];
    return HttpResponse.json({
      data: {
        user: {
          ...user,
          posts: demoPosts.filter(p => p.author._id === user._id),
          followersCount: user.followersCount || 0,
          followingCount: user.followingCount || 0,
          isFollowing: false
        }
      }
    });
  }),

  graphql.query('GetCurrentUser', () => {
    console.log('🎭 DEMO: GraphQL GetCurrentUser query intercepted');
    return HttpResponse.json({
      data: {
        me: demoUsers[0]
      }
    });
  }),

  graphql.query('GetFlights', () => {
    console.log('🎭 DEMO: GraphQL GetFlights query intercepted');
    return HttpResponse.json({
      data: {
        flights: demoFlights
      }
    });
  }),

  graphql.query('GetNotifications', () => {
    console.log('🎭 DEMO: GraphQL GetNotifications query intercepted');
    return HttpResponse.json({
      data: {
        notifications: demoNotifications
      }
    });
  }),

  graphql.mutation('CreatePost', ({ variables }) => {
    console.log('🎭 DEMO: GraphQL CreatePost mutation intercepted', variables);
    const newPost = {
      _id: Date.now().toString(),
      content: variables.content || variables.postInput?.content,
      author: demoUsers[0],
      images: [],
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };
    
    demoPosts.unshift(newPost);
    
    return HttpResponse.json({
      data: {
        createPost: newPost
      }
    });
  }),

  graphql.mutation('LikePost', ({ variables }) => {
    console.log('🎭 DEMO: GraphQL LikePost mutation intercepted', variables);
    const post = demoPosts.find(p => p._id === variables.postId);
    if (post) {
      const userIndex = post.likes.indexOf(demoUsers[0]._id);
      if (userIndex > -1) {
        post.likes.splice(userIndex, 1);
      } else {
        post.likes.push(demoUsers[0]._id);
      }
    }
    
    return HttpResponse.json({
      data: {
        likePost: {
          success: true,
          post
        }
      }
    });
  }),

  graphql.mutation('CreateComment', ({ variables }) => {
    console.log('🎭 DEMO: GraphQL CreateComment mutation intercepted', variables);
    const post = demoPosts.find(p => p._id === variables.postId);
    
    if (post) {
      const newComment = {
        _id: Date.now().toString(),
        content: variables.content,
        author: demoUsers[0],
        createdAt: new Date().toISOString()
      };
      
      post.comments = post.comments || [];
      post.comments.push(newComment);
      
      return HttpResponse.json({
        data: {
          createComment: {
            success: true,
            comment: newComment
          }
        }
      });
    }
    
    return HttpResponse.json({
      data: {
        createComment: {
          success: false,
          comment: null
        }
      }
    });
  })
];