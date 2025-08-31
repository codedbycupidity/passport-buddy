import { demoUsers } from './users';
import { demoPosts } from './posts';

// Helper to get user by ID
const getUserById = (id: string) => demoUsers.find(u => u._id === id) || demoUsers[0];
const getPostById = (id: string) => demoPosts.find(p => p._id === id);

// Demo notifications
export const demoNotifications = [
  {
    _id: 'n1',
    type: 'follow',
    message: 'started following you',
    sender: getUserById('2'),
    read: false,
    createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    _id: 'n2',
    type: 'like',
    message: 'liked your post',
    sender: getUserById('6'),
    post: getPostById('p1'),
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    _id: 'n3',
    type: 'comment',
    message: 'commented on your post',
    sender: getUserById('2'),
    post: getPostById('p1'),
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    _id: 'n4',
    type: 'follow',
    message: 'started following you',
    sender: getUserById('11'),
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: 'n5',
    type: 'like',
    message: 'liked your post',
    sender: getUserById('3'),
    post: getPostById('p1'),
    read: true,
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    _id: 'n6',
    type: 'mention',
    message: 'mentioned you in a comment',
    sender: getUserById('10'),
    post: getPostById('p3'),
    read: false,
    createdAt: new Date(Date.now() - 10800000).toISOString()
  },
  {
    _id: 'n7',
    type: 'follow',
    message: 'started following you',
    sender: getUserById('8'),
    read: true,
    createdAt: new Date(Date.now() - 259200000).toISOString()
  },
  {
    _id: 'n8',
    type: 'like',
    message: 'and 10 others liked your post',
    sender: getUserById('4'),
    post: getPostById('p1'),
    read: true,
    createdAt: new Date(Date.now() - 345600000).toISOString()
  }
];