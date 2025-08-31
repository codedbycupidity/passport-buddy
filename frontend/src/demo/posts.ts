import { demoUsers } from './users';
import { postPictures } from './postPictures';

// Helper to get user by ID
const getUserById = (id: string) => demoUsers.find(u => u._id === id) || demoUsers[0];

// Demo posts with rich content - every user has posts!
export const demoPosts = [
  // Beck's posts
  {
    _id: 'p1',
    content: 'Just launched Passport Buddy! 🚀 Excited to help travelers connect and share their journeys. Who\'s ready to explore the world together?',
    images: [postPictures.harmony],
    author: getUserById('1'),
    likes: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
    comments: [
      {
        _id: 'c1',
        content: 'Congratulations Beck! This is amazing! 🎉',
        author: getUserById('2'),
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        _id: 'c2',
        content: 'Finally! Been waiting for something like this',
        author: getUserById('6'),
        createdAt: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    location: 'San Francisco, CA',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    _id: 'p2',
    content: 'Nothing beats the Chicago skyline! Cloud Gate never gets old 🌆',
    images: [postPictures.chicagoBean],
    author: getUserById('1'),
    likes: ['3', '4', '5', '6', '11'],
    comments: [],
    location: 'Chicago, IL',
    createdAt: new Date(Date.now() - 604800000).toISOString()
  },

  // Sarah's posts
  {
    _id: 'p3',
    content: 'Chasing the Northern Lights in Iceland! 🌌 Bucket list moment right here!',
    images: [postPictures.northernLights],
    author: getUserById('2'),
    likes: ['1', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
    comments: [
      {
        _id: 'c3',
        content: 'Incredible shot! What camera settings did you use?',
        author: getUserById('1'),
        createdAt: new Date(Date.now() - 172800000).toISOString()
      }
    ],
    location: 'Reykjavik, Iceland',
    createdAt: new Date(Date.now() - 259200000).toISOString()
  },
  {
    _id: 'p4',
    content: 'London calling! 🇬🇧 Tower Bridge at golden hour is pure magic',
    images: [postPictures.london],
    author: getUserById('2'),
    likes: ['1', '6', '7', '8'],
    comments: [],
    location: 'London, UK',
    createdAt: new Date(Date.now() - 1209600000).toISOString()
  },

  // Mike's posts (pilot)
  {
    _id: 'p5',
    content: 'Office view today: Sunrise at 41,000ft somewhere over the Pacific ☀️✈️',
    images: [postPictures.hippopx],
    author: getUserById('3'),
    likes: ['1', '2', '4', '5', '6', '8', '9'],
    comments: [
      {
        _id: 'c4',
        content: 'Living the dream! What route today?',
        author: getUserById('8'),
        createdAt: new Date(Date.now() - 432000000).toISOString()
      }
    ],
    location: 'Somewhere over the Pacific',
    createdAt: new Date(Date.now() - 518400000).toISOString()
  },

  // Emma's posts (adventure)
  {
    _id: 'p6',
    content: 'Deep in the Amazon Rainforest! 🌿 The biodiversity here is mind-blowing',
    images: [postPictures.amazonRainforest],
    author: getUserById('4'),
    likes: ['1', '2', '7', '9', '10'],
    comments: [
      {
        _id: 'c5',
        content: 'Stay safe out there! How many days are you trekking?',
        author: getUserById('10'),
        createdAt: new Date(Date.now() - 691200000).toISOString()
      }
    ],
    location: 'Amazon Rainforest, Brazil',
    createdAt: new Date(Date.now() - 777600000).toISOString()
  },

  // Alex's posts (food & travel)
  {
    _id: 'p7',
    content: 'Seoul food tour continues! 🍜 This street food market is heaven',
    images: [postPictures.korea],
    author: getUserById('5'),
    likes: ['1', '2', '4', '7', '9'],
    comments: [
      {
        _id: 'c6',
        content: 'Drop the location! I\'m heading there next week',
        author: getUserById('7'),
        createdAt: new Date(Date.now() - 864000000).toISOString()
      }
    ],
    location: 'Seoul, South Korea',
    createdAt: new Date(Date.now() - 950400000).toISOString()
  },
  {
    _id: 'p8',
    content: 'Floating markets in Vietnam! 🛶 Best way to start the morning',
    images: [postPictures.vietnamRiver],
    author: getUserById('5'),
    likes: ['1', '2', '7', '9', '10'],
    comments: [],
    location: 'Mekong Delta, Vietnam',
    createdAt: new Date(Date.now() - 1296000000).toISOString()
  },

  // James's posts (luxury travel)
  {
    _id: 'p9',
    content: 'Reviewing the new Emirates First Class Suite on the A380. Full video coming soon! Spoiler: It\'s incredible 🥂✈️',
    images: [],
    author: getUserById('6'),
    likes: ['1', '3', '5', '8', '10', '11'],
    comments: [
      {
        _id: 'c7',
        content: 'Can\'t wait for the full review!',
        author: getUserById('11'),
        createdAt: new Date(Date.now() - 1036800000).toISOString()
      },
      {
        _id: 'c8',
        content: 'The bar on the A380 is my favorite part!',
        author: getUserById('8'),
        createdAt: new Date(Date.now() - 1033200000).toISOString()
      }
    ],
    location: 'Dubai International Airport',
    createdAt: new Date(Date.now() - 1123200000).toISOString()
  },

  // Nina's posts (digital nomad)
  {
    _id: 'p10',
    content: 'Miami vibes! 🌴 Collins Avenue is the perfect spot for sunset walks',
    images: [postPictures.collinsAve],
    author: getUserById('7'),
    likes: ['1', '2', '4', '5', '9', '10'],
    comments: [
      {
        _id: 'c9',
        content: 'Missing Miami! Which coworking space do you recommend?',
        author: getUserById('1'),
        createdAt: new Date(Date.now() - 1209600000).toISOString()
      }
    ],
    location: 'Miami Beach, FL',
    createdAt: new Date(Date.now() - 1382400000).toISOString()
  },

  // Olivia's posts (captain)
  {
    _id: 'p11',
    content: 'Proud moment: First female captain to land the A380 at this airport! Breaking barriers at 30,000 feet 💪✈️',
    images: [],
    author: getUserById('8'),
    likes: ['1', '2', '3', '4', '5', '6', '7', '9', '10', '11'],
    comments: [
      {
        _id: 'c10',
        content: 'You\'re an inspiration! Congratulations Captain! 👏',
        author: getUserById('3'),
        createdAt: new Date(Date.now() - 1468800000).toISOString()
      }
    ],
    location: 'Dubai, UAE',
    createdAt: new Date(Date.now() - 1555200000).toISOString()
  },

  // Raj's posts (budget travel)
  {
    _id: 'p12',
    content: 'Egypt on $30/day? YES! 🐪 Here\'s how I did it (blog link in bio)',
    images: [postPictures.egypt],
    author: getUserById('9'),
    likes: ['1', '4', '5', '7'],
    comments: [
      {
        _id: 'c11',
        content: 'Please share your hostel recommendations!',
        author: getUserById('4'),
        createdAt: new Date(Date.now() - 1641600000).toISOString()
      }
    ],
    location: 'Cairo, Egypt',
    createdAt: new Date(Date.now() - 1728000000).toISOString()
  },

  // Lisa's posts (island hopper)
  {
    _id: 'p13',
    content: 'Olympic National Park! 🏔️ Sometimes the best islands are the ones surrounded by trees',
    images: [postPictures.olympicPark],
    author: getUserById('10'),
    likes: ['1', '2', '4', '6', '7', '9'],
    comments: [],
    location: 'Olympic National Park, WA',
    createdAt: new Date(Date.now() - 1814400000).toISOString()
  },

  // Marcus's posts (points expert)
  {
    _id: 'p14',
    content: 'Pro tip: Just booked 5 nights in Tokyo + flights for 80k points! 💳✈️ Full breakdown on my blog',
    images: [],
    author: getUserById('11'),
    likes: ['1', '2', '3', '5', '6', '9'],
    comments: [
      {
        _id: 'c12',
        content: 'Which card combo did you use?',
        author: getUserById('9'),
        createdAt: new Date(Date.now() - 1900800000).toISOString()
      },
      {
        _id: 'c13',
        content: 'Chase trifecta + Amex Gold. Check my latest post!',
        author: getUserById('11'),
        createdAt: new Date(Date.now() - 1897200000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 1987200000).toISOString()
  }
];