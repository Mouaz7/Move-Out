module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!jest.config.js',
  ],

  testMatch: [
    '**/tests/**/*.test.js',
  ],
  moduleNameMapper: {
    '^../../config/db/database$': '<rootDir>/config/db/database',
    '^../../../config/db/database$': '<rootDir>/config/db/database',
    '^../../src/services/(.*)$': '<rootDir>/src/services/$1',
    '^../../../src/services/(.*)$': '<rootDir>/src/services/$1',
    '^../../../routes/(.*)$': '<rootDir>/routes/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  testTimeout: 10000,
};
