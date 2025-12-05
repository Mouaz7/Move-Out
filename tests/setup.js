// Global test setup
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-secret-key-for-testing-only";
process.env.EMAIL_USER = "test@example.com";
process.env.EMAIL_PASS = "test-password";
process.env.BASE_URL = "http://localhost:1338";

// Suppress console logs during tests (comment out to debug)
global.console = {
  ...console,
  log: jest.fn(), // Suppress console.log
  error: jest.fn(), // Keep console.error for debugging
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
