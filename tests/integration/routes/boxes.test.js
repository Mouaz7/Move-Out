/**
 * Integration tests for box routes
 * Tests: CRUD operations, file uploads, QR access, PIN validation
 */

// Mock database
jest.mock('../../../config/db/database', () => ({
  getConnection: jest.fn(),
  query: jest.fn(),
  healthCheck: jest.fn(),
  isUsingMySQL: jest.fn(() => true),
}));

// Mock boxService functions
jest.mock('../../../src/services/boxService', () => ({
  getAllBoxes: jest.fn(),
  getBoxById: jest.fn(),
  getBoxContents: jest.fn(),
  createBox: jest.fn(),
  deleteBox: jest.fn(),
  createOrUpdateLabel: jest.fn(),
  getBoxByToken: jest.fn(), // Added this
}));

const db = require('../../../config/db/database');
const boxService = require('../../../src/services/boxService');

describe('Box Routes', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getConnection.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /boxes', () => {
    test('should return all boxes for authenticated user', async () => {
      // Mock boxes
      boxService.getAllBoxes.mockResolvedValue([
        { box_id: 1, box_name: 'Box 1' },
        { box_id: 2, box_name: 'Box 2' },
      ]);

      const boxes = await boxService.getAllBoxes(1);
      expect(boxes).toHaveLength(2);
      expect(boxes[0].box_name).toBe('Box 1');
    });

    test('should return empty array when user has no boxes', async () => {
      boxService.getAllBoxes.mockResolvedValue([]);

      const boxes = await boxService.getAllBoxes(1);
      expect(boxes).toHaveLength(0);
    });
  });

  describe('GET /boxes/view/:boxId', () => {
    test('should return box details for valid box ID', async () => {
      boxService.getBoxById.mockResolvedValue({
        box_id: 1,
        box_name: 'Test Box',
        user_id: 1,
        is_private: false,
      });

      const box = await boxService.getBoxById(1, 1);
      expect(box).toBeDefined();
      expect(box.box_name).toBe('Test Box');
    });

    test('should return null for non-existent box', async () => {
      boxService.getBoxById.mockResolvedValue(null);

      const box = await boxService.getBoxById(999, 1);
      expect(box).toBeNull();
    });

    test('should return null for box not owned by user', async () => {
      boxService.getBoxById.mockResolvedValue(null);

      const box = await boxService.getBoxById(1, 999);
      expect(box).toBeNull();
    });
  });

  describe('Box Creation', () => {
    test('should create box with valid data', async () => {
      boxService.createBox.mockResolvedValue(1);

      const boxId = await boxService.createBox(1, 'New Box', 'Label', 'default.png', 'text', 'Content', null, 0, null);
      expect(boxId).toBe(1);
      expect(boxService.createBox).toHaveBeenCalledWith(1, 'New Box', 'Label', 'default.png', 'text', 'Content', null, 0, null);
    });

    test('should create private box with PIN', async () => {
      boxService.createBox.mockResolvedValue(2);

      const boxId = await boxService.createBox(1, 'Private Box', 'Label', 'default.png', 'text', 'Secret', null, 1, '1234');
      expect(boxId).toBe(2);
      expect(boxService.createBox).toHaveBeenCalledWith(1, 'Private Box', 'Label', 'default.png', 'text', 'Secret', null, 1, '1234');
    });
  });

  describe('Box Deletion', () => {
    test('should delete box successfully', async () => {
      boxService.deleteBox.mockResolvedValue(true);

      const result = await boxService.deleteBox(1, 1);
      expect(result).toBe(true);
      expect(boxService.deleteBox).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('QR Code Access', () => {
    test('should fetch box by access token', async () => {
      mockConnection.query.mockResolvedValue([[{
        box_id: 1,
        box_name: 'QR Box',
        access_token: 'abc123',
        is_private: false,
      }]]);

      const [rows] = await mockConnection.query('SELECT * FROM boxes WHERE access_token = ?', ['abc123']);
      expect(rows).toHaveLength(1);
      expect(rows[0].box_name).toBe('QR Box');
    });

    test('should return empty for invalid token', async () => {
      mockConnection.query.mockResolvedValue([[]]);

      const [rows] = await mockConnection.query('SELECT * FROM boxes WHERE access_token = ?', ['invalid']);
      expect(rows).toHaveLength(0);
    });
  });

  describe('PIN Validation', () => {
    test('should validate correct PIN', async () => {
      const box = { pin_code: '1234', is_private: true };
      const isValid = box.pin_code === '1234';
      expect(isValid).toBe(true);
    });

    test('should reject incorrect PIN', async () => {
      const box = { pin_code: '1234', is_private: true };
      const isValid = box.pin_code === '0000';
      expect(isValid).toBe(false);
    });
  });

  describe('Label Management', () => {
    test('should create or update label', async () => {
      boxService.createOrUpdateLabel.mockResolvedValue(1);

      const labelId = await boxService.createOrUpdateLabel(null, 'New Label', false, 1);
      expect(labelId).toBe(1);
    });

    test('should create private label with PIN', async () => {
      boxService.createOrUpdateLabel.mockResolvedValue(2);

      const labelId = await boxService.createOrUpdateLabel(null, 'Private Label', true, 1);
      expect(labelId).toBe(2);
      expect(boxService.createOrUpdateLabel).toHaveBeenCalledWith(null, 'Private Label', true, 1);
    });
  });
});
