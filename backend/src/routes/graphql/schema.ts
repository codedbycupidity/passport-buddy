import { buildSchema } from 'graphql';

// This exports the schema definition.
// The key types here are `RootQuery` and `RootMutation`.
export default buildSchema(`
    type Image {
        url: String!
        key: String!
        size: Int!
        mimetype: String!
    }

    type User {
        _id: ID!
        username: String!
        fullName: String!
        avatar: String
        bio: String
        location: String
        homeAirport: String
        passportCountry: String
        milesFlown: Int
        countriesVisited: [String!]!
        emailVerified: Boolean!
    }

    type Comment {
        _id: ID!
        author: User
        content: String!
        createdAt: String!
    }

    type Post {
        _id: ID!
        author: User
        content: String!
        images: [Image!]!
        likes: [String!]!
        bookmarks: [String!]!
        comments: [Comment!]!
        createdAt: String!
    }

    input PostInput {
        content: String!
    }

    input UpdateProfileInput {
        fullName: String
        bio: String
        location: String
        homeAirport: String
        passportCountry: String
        avatar: String
    }

    type AuthVerification {
        valid: Boolean!
        message: String
        user: User
    }

    type FlightStatsSummary {
        totalFlights: Int!
        totalDistance: Int!
        totalPoints: Int!
        uniqueAirlines: Int!
        uniqueDestinations: Int!
        uniqueCountries: Int!
        airlines: [String!]!
        destinations: [String!]!
    }

    type FlightsByMonth {
        _id: Int!
        count: Int!
        distance: Int!
        points: Int!
    }

    type TopRoute {
        _id: TopRouteId!
        count: Int!
        totalDistance: Int!
    }

    type TopRouteId {
        origin: String!
        destination: String!
    }

    type MostVisitedAirport {
        code: String!
        name: String!
        city: String!
        country: String!
        visits: Int!
    }

    type FavoriteAirline {
        code: String!
        name: String!
        flights: Int!
    }

    type FlightStats {
        summary: FlightStatsSummary
        flightsByMonth: [FlightsByMonth!]!
        topRoutes: [TopRoute!]!
        # Legacy flat structure for backward compatibility
        totalFlights: Int
        totalDistance: Int
        totalFlightTime: Int
        uniqueAirports: Int
        uniqueCountries: Int
        uniqueAirlines: Int
        carbonEmissions: Int
        averageFlightDistance: Int
        totalPoints: Int
        uniqueDestinations: Int
        mostVisitedAirport: MostVisitedAirport
        favoriteAirline: FavoriteAirline
    }

    type RootQuery {
        posts: [Post!]!
        user(userId: ID): User
        me: User
        verifyAuth: AuthVerification!
        flightStats(userId: ID, year: Int): FlightStats
    }

    type RootMutation {
        createPost(postInput: PostInput!): Post
        updateProfile(input: UpdateProfileInput!): User
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
