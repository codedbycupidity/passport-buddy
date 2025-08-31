module.exports = {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": [
    "<rootDir>/src",
    "<rootDir>/test"
  ],
  "testMatch": [
    "**/*.test.ts"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/test/setup.ts"
  ],
  "collectCoverageFrom": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.test.ts",
    "!src/server.ts"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  },
  "coverageReporters": [
    "text",
    "lcov",
    "html"
  ],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}