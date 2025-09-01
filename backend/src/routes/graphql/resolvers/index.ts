import { strictDateExtraction } from '../../../utils/dateStrict';
import mongoose from 'mongoose';
import { AuthenticationError } from 'apollo-server-express';
import Post, { IPost } from '../../../models/Post';
import User from '../../../models/User';
import Flight from '../../../models/Flight';
// TODO: Replace with shared module import when available
// import { createPostSchema } from '@my-app/shared';
import { z, ZodError } from 'zod';

// Temporary schema definition
const createPostSchema = z.object({
  content: z.string().min(1).max(500)
});

// KEY CHANGE: Changed `export const resolvers =` to `export default`
export default {
  RootQuery: {
    posts: async () => {
      try {
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Database not connected');
        }
        const posts = await Post.find()
          .populate(
            'author',
            'username fullName avatar bio location homeAirport passportCountry milesFlown countriesVisited emailVerified'
          )
          .populate('comments.author', 'username fullName avatar')
          .sort({ createdAt: -1 })
          .lean();

        return posts.map((post: any) => ({
          _id: post._id.toString(),
          author: post.author
            ? {
                _id: post.author._id.toString(),
                username: post.author.username,
                fullName: post.author.fullName,
                avatar: post.author.avatar,
              }
            : null,
          content: post.content,
          images: post.images || [],
          likes: Array.isArray(post.likes) ? post.likes.map((id: any) => id?.toString() || '') : [],
          comments: (post.comments || []).map((comment: any) => ({
            _id: comment._id?.toString() || '',
            author: comment.author
              ? {
                  _id: comment.author._id?.toString() || '',
                  username: comment.author.username || '',
                  fullName: comment.author.fullName || '',
                  avatar: comment.author.avatar || null,
                }
              : null,
            content: comment.content,
            createdAt: comment.createdAt ? comment.createdAt.toISOString() : strictDateExtraction().toISOString(),
          })),
          createdAt: post.createdAt.toISOString(),
        }));
      } catch (err) {
        console.error('Error fetching posts:', err);
        throw new Error('An error occurred while fetching posts.');
      }
    },
    user: async (_: any, { userId }: { userId?: string }, context: any) => {
      try {
        const id = userId || context.userId;
        if (!id) {
          throw new AuthenticationError('User ID required');
        }

        const user = await User.findById(id).lean();
        if (!user) {
          throw new Error('User not found');
        }

        return {
          _id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          avatar: user.avatar,
          bio: user.bio,
          location: user.location,
          homeAirport: user.homeAirport,
          passportCountry: user.passportCountry,
          milesFlown: user.milesFlown,
          countriesVisited: user.countriesVisited || [],
          emailVerified: user.emailVerified,
        };
      } catch (err) {
        console.error('Error fetching user:', err);
        throw err;
      }
    },
    me: async (_: any, __: any, context: any) => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('Not authenticated');
        }

        const user = await User.findById(context.userId).lean();
        if (!user) {
          throw new Error('User not found');
        }

        return {
          _id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          avatar: user.avatar,
          bio: user.bio,
          location: user.location,
          homeAirport: user.homeAirport,
          passportCountry: user.passportCountry,
          milesFlown: user.milesFlown,
          countriesVisited: user.countriesVisited || [],
          emailVerified: user.emailVerified,
        };
      } catch (err) {
        console.error('Error fetching current user:', err);
        throw err;
      }
    },
    verifyAuth: async (_: any, __: any, context: any) => {
      try {
        console.log('🔐 GRAPHQL_VERIFY: Request received');
        console.log('🔐 Context userId:', context.userId);

        if (!context.userId) {
          console.log('❌ GRAPHQL_VERIFY: No user ID in context');
          return {
            valid: false,
            message: 'No authentication token provided',
            user: null,
          };
        }

        const user = await User.findById(context.userId).select('-password').lean();

        if (!user) {
          console.log('❌ GRAPHQL_VERIFY: User not found in database');
          return {
            valid: false,
            message: 'User not found',
            user: null,
          };
        }

        console.log('✅ GRAPHQL_VERIFY: Authentication successful for:', user.username);

        return {
          valid: true,
          message: 'Authentication successful',
          user: {
            _id: user._id.toString(),
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar,
            bio: user.bio,
            location: user.location,
            homeAirport: user.homeAirport,
            passportCountry: user.passportCountry,
            milesFlown: user.milesFlown,
            countriesVisited: user.countriesVisited || [],
            emailVerified: user.emailVerified,
          },
        };
      } catch (err) {
        console.error('❌ GRAPHQL_VERIFY: Error:', err);
        return {
          valid: false,
          message: 'Authentication verification failed',
          user: null,
        };
      }
    },
    flightStats: async (_: any, { userId, year }: { userId?: string; year?: number }, context: any) => {
      try {
        console.log('🔍 GRAPHQL_FLIGHT_STATS: Request received', {
          providedUserId: userId,
          contextUserId: context.userId,
          hasContext: !!context,
          year
        });

        // Allow fetching stats for a specific user or default to authenticated user
        const targetUserId = userId || context.userId;

        console.log('🔍 GRAPHQL_FLIGHT_STATS: Target user ID', targetUserId);

        if (!targetUserId) {
          console.log('❌ GRAPHQL_FLIGHT_STATS: No user ID available');
          throw new AuthenticationError('User ID required');
        }

        // Convert string to ObjectId for MongoDB query
        const matchQuery: any = { userId: new mongoose.Types.ObjectId(targetUserId) };

        if (year) {
          const startDate = new Date(`${year}-01-01`);
          const endDate = new Date(`${year}-12-31`);
          matchQuery.scheduledDepartureTime = { $gte: startDate, $lte: endDate };
        }

        const stats = await Flight.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: null,
              totalFlights: { $sum: 1 },
              totalDistance: { $sum: '$distance' },
              totalPoints: { $sum: '$points' },
              airlines: { $addToSet: '$airline' },
              destinations: { $addToSet: '$destination.city' },
              originCountries: { $addToSet: '$origin.country' },
              destCountries: { $addToSet: '$destination.country' },
            },
          },
          {
            $project: {
              _id: 0,
              totalFlights: 1,
              totalDistance: 1,
              totalPoints: 1,
              uniqueAirlines: { $size: '$airlines' },
              uniqueDestinations: { $size: '$destinations' },
              uniqueCountries: {
                $size: {
                  $setUnion: ['$originCountries', '$destCountries'],
                },
              },
              airlines: 1,
              destinations: 1,
            },
          },
        ]);

        // Get flights by month
        const flightsByMonth = await Flight.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: { $month: '$scheduledDepartureTime' },
              count: { $sum: 1 },
              distance: { $sum: '$distance' },
              points: { $sum: '$points' },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // Get top routes
        const topRoutes = await Flight.aggregate([
          { $match: matchQuery },
          {
            $group: {
              _id: {
                origin: '$origin.code',
                destination: '$destination.code',
              },
              count: { $sum: 1 },
              totalDistance: { $sum: '$distance' },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]);

        const summary = stats[0] || {
          totalFlights: 0,
          totalDistance: 0,
          totalPoints: 0,
          uniqueAirlines: 0,
          uniqueDestinations: 0,
          uniqueCountries: 0,
          airlines: [],
          destinations: [],
        };
        
        return {
          summary,
          flightsByMonth,
          topRoutes,
          // Legacy flat structure for backward compatibility
          totalFlights: summary.totalFlights,
          totalDistance: summary.totalDistance,
          totalPoints: summary.totalPoints,
          uniqueDestinations: summary.uniqueDestinations,
          uniqueAirlines: summary.uniqueAirlines,
          totalFlightTime: 0, // Not calculated yet
          uniqueAirports: summary.uniqueDestinations, // Using destinations as proxy
          uniqueCountries: summary.uniqueCountries,
          carbonEmissions: 0, // Not calculated yet
          averageFlightDistance: summary.totalFlights > 0 ? Math.round(summary.totalDistance / summary.totalFlights) : 0,
          mostVisitedAirport: null, // TODO: Implement if needed
          favoriteAirline: null, // TODO: Implement if needed
        };
      } catch (err) {
        console.error('Error fetching flight stats:', err);
        throw err;
      }
    },
  },
  RootMutation: {
    createPost: async (_: any, { postInput }: { postInput: { content: string } }, context: any) => {
      try {
        // Check if user is authenticated
        if (!context.userId) {
          throw new AuthenticationError('You must be logged in to create a post');
        }

        const validated = createPostSchema.parse(postInput);
        const newPost = new Post({
          content: validated.content,
          author: context.userId,
          images: [],
        });
        await newPost.save();

        await newPost.populate(
          'author',
          'username fullName avatar bio location homeAirport passportCountry milesFlown countriesVisited emailVerified'
        );

        return {
          _id: newPost._id.toString(),
          author: newPost.author
            ? {
                _id: (newPost.author as any)._id.toString(),
                username: (newPost.author as any).username,
                fullName: (newPost.author as any).fullName,
                avatar: (newPost.author as any).avatar,
              }
            : null,
          content: newPost.content,
          images: newPost.images || [],
          likes: [],
          comments: [],
          createdAt: newPost.createdAt.toISOString(),
        };
      } catch (err) {
        if (err instanceof ZodError) {
          const validationErrorMessage = err.errors.map(e => e.message).join(', ');
          throw new AuthenticationError(`Validation error: ${validationErrorMessage}`);
        }
        console.error('Error creating post:', err);
        throw new Error('An error occurred while creating the post.');
      }
    },
    updateProfile: async (_: any, { input }: { input: any }, context: any) => {
      try {
        if (!context.userId) {
          throw new AuthenticationError('You must be logged in to update your profile');
        }

        // Build update object with only provided fields
        const updateData: any = {};

        if (input.fullName !== undefined) updateData.fullName = input.fullName;
        if (input.bio !== undefined) updateData.bio = input.bio;
        if (input.location !== undefined) updateData.location = input.location;
        if (input.homeAirport !== undefined) updateData.homeAirport = input.homeAirport;
        if (input.passportCountry !== undefined) updateData.passportCountry = input.passportCountry;
        if (input.avatar !== undefined) updateData.avatar = input.avatar;

        const user = await User.findByIdAndUpdate(context.userId, updateData, {
          new: true,
          runValidators: true,
        }).lean();

        if (!user) {
          throw new Error('User not found');
        }

        return {
          _id: user._id.toString(),
          username: user.username,
          fullName: user.fullName,
          avatar: user.avatar,
          bio: user.bio,
          location: user.location,
          homeAirport: user.homeAirport,
          passportCountry: user.passportCountry,
          milesFlown: user.milesFlown,
          countriesVisited: user.countriesVisited || [],
          emailVerified: user.emailVerified,
        };
      } catch (err) {
        console.error('Error updating profile:', err);
        throw err;
      }
    },
  },
};
