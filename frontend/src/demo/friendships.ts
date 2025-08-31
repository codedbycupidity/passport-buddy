// Demo friendships/following relationships
// Beck (user 1) follows everyone and everyone follows Beck back
export const friendships = [
  // Beck's connections
  { followerId: '1', followingId: '2' },
  { followerId: '1', followingId: '3' },
  { followerId: '1', followingId: '4' },
  { followerId: '1', followingId: '5' },
  { followerId: '1', followingId: '6' },
  { followerId: '1', followingId: '7' },
  { followerId: '1', followingId: '8' },
  { followerId: '1', followingId: '9' },
  { followerId: '1', followingId: '10' },
  { followerId: '1', followingId: '11' },
  
  // Everyone follows Beck back
  { followerId: '2', followingId: '1' },
  { followerId: '3', followingId: '1' },
  { followerId: '4', followingId: '1' },
  { followerId: '5', followingId: '1' },
  { followerId: '6', followingId: '1' },
  { followerId: '7', followingId: '1' },
  { followerId: '8', followingId: '1' },
  { followerId: '9', followingId: '1' },
  { followerId: '10', followingId: '1' },
  { followerId: '11', followingId: '1' },
  
  // Other connections (pilots follow each other)
  { followerId: '3', followingId: '8' },
  { followerId: '8', followingId: '3' },
  
  // Travel bloggers follow each other
  { followerId: '2', followingId: '5' },
  { followerId: '5', followingId: '2' },
  { followerId: '2', followingId: '7' },
  { followerId: '7', followingId: '2' },
  
  // Budget travelers connect
  { followerId: '4', followingId: '9' },
  { followerId: '9', followingId: '4' },
  
  // Luxury travelers connect
  { followerId: '6', followingId: '8' },
  { followerId: '6', followingId: '11' },
  { followerId: '11', followingId: '6' },
  
  // Island hoppers and adventure travelers
  { followerId: '10', followingId: '4' },
  { followerId: '4', followingId: '10' },
];

// Helper function to check if two users are friends
export const areFriends = (userId1: string, userId2: string): boolean => {
  return friendships.some(f => 
    (f.followerId === userId1 && f.followingId === userId2) ||
    (f.followerId === userId2 && f.followingId === userId1)
  );
};

// Get all friends for a user
export const getFriends = (userId: string): string[] => {
  const following = friendships
    .filter(f => f.followerId === userId)
    .map(f => f.followingId);
  
  const followers = friendships
    .filter(f => f.followingId === userId)
    .map(f => f.followerId);
  
  // Return unique mutual connections (friends)
  return [...new Set(following.filter(id => followers.includes(id)))];
};