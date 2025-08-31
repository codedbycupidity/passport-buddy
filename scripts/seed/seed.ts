import { safeStrictDateExtraction } from '../utils/dateStrict';
import mongoose from 'mongoose';
import User from '../models/User';
import Post from '../models/Post';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/devdb';

// Test users data
const testUsers = [
  {
    username: 'izaacplambeck',
    email: 'izaac@test.com',
    fullName: 'Izaac Plambeck',
    password: 'Test123',
    bio: 'Adventure seeker and world traveler. Love exploring new cultures!',
    location: 'San Francisco, CA',
    homeAirport: 'SFO',
    passportCountry: 'USA',
    milesFlown: 150000,
    countriesVisited: ['USA', 'Canada', 'Mexico', 'Japan', 'Thailand', 'France', 'Germany', 'UK'],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Izaac+Plambeck&background=6366f1&color=fff',
  },
  {
    username: 'diab',
    email: 'diab@test.com',
    fullName: 'Diab Ali',
    password: 'Test123',
    bio: 'Digital nomad working from different countries. Coffee enthusiast ☕',
    location: 'Dubai, UAE',
    homeAirport: 'DXB',
    passportCountry: 'UAE',
    milesFlown: 200000,
    countriesVisited: ['UAE', 'Egypt', 'Turkey', 'Greece', 'Italy', 'Spain', 'Morocco', 'Jordan'],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Diab+Ali&background=10b981&color=fff',
  },
  {
    username: 'devonvill',
    email: 'devon@test.com',
    fullName: 'Devon Vill',
    password: 'Test123',
    bio: 'Photography lover capturing moments around the globe 📸',
    location: 'London, UK',
    homeAirport: 'LHR',
    passportCountry: 'UK',
    milesFlown: 180000,
    countriesVisited: ['UK', 'Ireland', 'France', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Czech Republic'],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Devon+Vill&background=f59e0b&color=fff',
  },
  {
    username: 'masonmiles',
    email: 'mason@test.com',
    fullName: 'Mason Miles',
    password: 'Test123',
    bio: 'Miles and smiles collector. Aviation geek ✈️',
    location: 'Chicago, IL',
    homeAirport: 'ORD',
    passportCountry: 'USA',
    milesFlown: 250000,
    countriesVisited: ['USA', 'Canada', 'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Costa Rica'],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Mason+Miles&background=ef4444&color=fff',
  },
  {
    username: 'jacobroberts',
    email: 'jacob@test.com',
    fullName: 'Jacob Roberts',
    password: 'Test123',
    bio: 'Budget traveler finding the best deals. Hostel life enthusiast!',
    location: 'Sydney, Australia',
    homeAirport: 'SYD',
    passportCountry: 'Australia',
    milesFlown: 120000,
    countriesVisited: ['Australia', 'New Zealand', 'Indonesia', 'Malaysia', 'Singapore', 'Vietnam', 'Cambodia', 'Laos'],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Jacob+Roberts&background=8b5cf6&color=fff',
  },
  {
    username: 'laylale',
    email: 'layla@test.com',
    fullName: 'Layla Le',
    password: 'Test123',
    bio: 'Solo female traveler inspiring others. Safety tips and hidden gems 💎',
    location: 'Vancouver, Canada',
    homeAirport: 'YVR',
    passportCountry: 'Canada',
    milesFlown: 165000,
    countriesVisited: ['Canada', 'USA', 'South Korea', 'Japan', 'Taiwan', 'Philippines', 'India', 'Nepal'],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Layla+Le&background=ec4899&color=fff',
  },
  {
    username: 'evahocking',
    email: 'eva@test.com',
    fullName: 'Eva Hocking',
    password: 'Test123',
    bio: 'Luxury travel blogger. First class experiences on a business class budget 🥂',
    location: 'New York, NY',
    homeAirport: 'JFK',
    passportCountry: 'USA',
    milesFlown: 300000,
    countriesVisited: [
      'USA',
      'UK',
      'France',
      'Italy',
      'Switzerland',
      'Monaco',
      'Dubai',
      'Singapore',
      'Japan',
      'Maldives',
    ],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Eva+Hocking&background=14b8a6&color=fff',
  },
  {
    username: 'testuser',
    email: 'test@test.com',
    fullName: 'Test User',
    password: 'Test123',
    bio: 'Test account for development and QA testing',
    location: 'Test City, TC',
    homeAirport: 'TST',
    passportCountry: 'Test Country',
    milesFlown: 100000,
    countriesVisited: ['USA', 'Canada', 'Mexico'],
    emailVerified: true,
    avatar: 'https://ui-avatars.com/api/?name=Test+User&background=6b7280&color=fff',
  },
];

// Sample posts data
const samplePosts = [
  {
    content:
      'Just landed in Tokyo! 🗼 The cherry blossoms are in full bloom and the city is absolutely magical. First stop: Shibuya crossing!',
    images: [],
    location: 'Tokyo, Japan',
  },
  {
    content:
      "Found this hidden beach in Bali that's not in any guidebook. Crystal clear water and not a single tourist in sight! 🏝️",
    images: [],
    location: 'Bali, Indonesia',
  },
  {
    content:
      'Managed to snag a business class upgrade on my flight to Dubai! Sometimes being nice to gate agents really pays off 😊✈️',
    images: [],
    location: 'In-flight to Dubai',
  },
  {
    content:
      'Street food tour in Bangkok was incredible! Tom yum soup from a cart tastes better than any restaurant 🍜',
    images: [],
    location: 'Bangkok, Thailand',
  },
  {
    content: 'Hiking Machu Picchu at sunrise was worth the 4am wake up call. This view is unreal! 🏔️',
    images: [],
    location: 'Machu Picchu, Peru',
  },
  {
    content:
      "Pro tip: Always pack a portable charger and universal adapter. Saved me so many times! What's your must-have travel item?",
    images: [],
    location: null,
  },
  {
    content: 'Northern Lights in Iceland tonight! No photo can capture how magical this is 💚✨',
    images: [],
    location: 'Reykjavik, Iceland',
  },
  {
    content:
      "Missed my connecting flight but the airline put me up in a 5-star hotel. Sometimes delays aren't so bad! 😅",
    images: [],
    location: 'Singapore Changi Airport',
  },
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Post.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];

    for (const userData of testUsers) {
      // Don't hash password here - User model pre-save hook will handle it
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`✅ Created user: ${user.username}`);
    }

    // Create posts
    console.log('📝 Creating posts...');
    const createdPosts = [];

    for (let i = 0; i < samplePosts.length; i++) {
      const post = samplePosts[i];
      const randomUser = createdUsers[Math.floor(Math.random() * (createdUsers.length - 1))]; // Exclude test user

      const createdPost = await Post.create({
        ...post,
        author: randomUser._id,
        likes: [],
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
      });

      // Add random likes
      const numberOfLikes = Math.floor(Math.random() * createdUsers.length);
      const likers = [...createdUsers].sort(() => 0.5 - Math.random()).slice(0, numberOfLikes);
      createdPost.likes = likers.map(user => user._id);
      await createdPost.save();

      createdPosts.push(createdPost);
      console.log(`✅ Created post by ${randomUser.username}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Test Users Created:');
    console.log('====================');
    for (const user of testUsers) {
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log('---');
    }

    console.log('\n🎉 Seed completed! You can now login with any of the test users.');
    console.log('\nExample logins:');
    console.log('- Username: izaacplambeck OR Email: izaac@test.com');
    console.log('- Username: testuser OR Email: test@test.com');
    console.log('- Password for all users: Test123');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
