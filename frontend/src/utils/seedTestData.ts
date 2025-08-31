import { postService } from '../services/post.service';

export async function seedTestData() {
  console.log('🌱 Seeding test data...');

  const testPosts = [
    {
      content:
        "Just landed in Tokyo! 🗼 The journey from LAX was smooth, and I'm excited to explore the city. First stop: Shibuya crossing!",
      images: [],
    },
    {
      content: 'Beautiful sunset view from my hotel in Santorini. The Greek islands never disappoint! 🌅',
      images: [],
    },
    {
      content: 'Airport lounge hopping at Singapore Changi. This place is more like a luxury mall than an airport! ✈️',
      images: [],
    },
    {
      content: 'Road trip through the Scottish Highlands. The landscapes here are absolutely breathtaking! 🏔️',
      images: [],
    },
    {
      content: 'Street food tour in Bangkok. The pad thai here is incredible! Who else loves Thai cuisine? 🍜',
      images: [],
    },
  ];

  const createdPosts = [];

  for (const postData of testPosts) {
    try {
      const post = await postService.createPost(postData);
      createdPosts.push(post);
      console.log(`✅ Created post: "${postData.content.substring(0, 50)}..."`);

      // Add a small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('❌ Failed to create post:', error);
    }
  }

  // Add some comments to the posts
  if (createdPosts.length > 0) {
    const comments = [
      'Wow, amazing! Have a great time!',
      'I was there last month, highly recommend visiting the temples!',
      'Safe travels! 🎉',
      'The views look incredible!',
      'Adding this to my bucket list!',
    ];

    for (let i = 0; i < 3; i++) {
      const randomPost = createdPosts[Math.floor(Math.random() * createdPosts.length)];
      const randomComment = comments[Math.floor(Math.random() * comments.length)];

      try {
        await postService.addComment(randomPost._id, randomComment);
        console.log('💬 Added comment to post');
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('❌ Failed to add comment:', error);
      }
    }
  }

  console.log(`\n✅ Seeding complete! Created ${createdPosts.length} posts with comments.`);
  console.log('You can now run stress tests with: runStressTest("mixed")');

  return createdPosts;
}

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).seedTestData = seedTestData;
}
