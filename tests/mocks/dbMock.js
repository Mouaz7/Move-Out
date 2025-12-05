// Mock PostgreSQL connection pool for testing
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
};

// Mock client object (PostgreSQL uses client instead of connection)
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// Helper function to create mock users
const createMockUser = (overrides = {}) => ({
  user_id: 1,
  email: "test@example.com",
  password_hash: "$2a$10$abcdefghijklmnopqrstuvwxyz12345",
  profile_name: "Test User",
  is_verified: true,
  is_active: true,
  is_admin: false,
  storage_usage: 0,
  last_activity: new Date(),
  created_at: new Date(),
  ...overrides,
});

// Helper function to create mock boxes
const createMockBox = (overrides = {}) => ({
  box_id: 1,
  user_id: 1,
  box_name: "Test Box",
  label_name: "Test Label",
  label_image: "default-label.png",
  content_type: "text",
  content_data: "Test content",
  access_token: "test-access-token-123",
  qr_code: "data:image/png;base64,test-qr-code",
  is_private: false,
  pin_code: null,
  created_at: new Date(),
  ...overrides,
});

// Reset all mocks
const resetMocks = () => {
  mockPool.connect.mockReset();
  mockPool.query.mockReset();
  mockPool.end.mockReset();
  mockClient.query.mockReset();
  mockClient.release.mockReset();
};

// Setup default mock behavior
const setupDefaultMocks = () => {
  mockPool.connect.mockResolvedValue(mockClient);
  mockClient.release.mockImplementation(() => {});
};

module.exports = {
  mockPool,
  mockClient,
  createMockUser,
  createMockBox,
  resetMocks,
  setupDefaultMocks,
};
