// Central export for all demo data
export { demoUsers } from './users';
export { demoPosts } from './posts';
export { demoFlights } from './flights';
export { demoNotifications } from './notifications';
export { friendships, areFriends, getFriends } from './friendships';

// Export the default demo user (Beck) - just reference from demoUsers
import { demoUsers } from './users';
export const currentDemoUser = demoUsers[0];