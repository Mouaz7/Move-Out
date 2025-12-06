/**
 * Jest test setup
 * Configures test environment and mocks
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test-password';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup database mock
jest.mock('../config/db/database', () => ({
  getConnection: jest.fn(),
  query: jest.fn(),
  healthCheck: jest.fn(),
  closeConnections: jest.fn(),
  isUsingMySQL: jest.fn(() => true),
  isUsingPostgreSQL: jest.fn(() => false),
}));

// Close database connections after all tests
afterAll(async () => {
  // Clean up any open connections
  jest.clearAllMocks();
});
