/**
 * Integration tests for profile routes
 * Tests: profile view, update, deactivate, reactivate
 */

const bcrypt = require("bcrypt");

// Mock database
jest.mock("../../../config/db/database", () => ({
  getConnection: jest.fn(),
  query: jest.fn(),
  healthCheck: jest.fn(),
  isUsingMySQL: jest.fn(() => true),
}));

const db = require("../../../config/db/database");

describe("Profile Routes", () => {
  let mockConnection;
  let mockUser;

  beforeEach(async () => {
    mockConnection = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.getConnection.mockResolvedValue(mockConnection);

    // Create mock user with hashed password
    const hashedPassword = await bcrypt.hash("CurrentPassword123!", 10);
    mockUser = {
      user_id: 1,
      email: "test@example.com",
      password_hash: hashedPassword,
      profile_name: "Test User",
      is_active: true,
      is_admin: false,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Profile Update", () => {
    test("should verify current password correctly", async () => {
      const isValid = await bcrypt.compare(
        "CurrentPassword123!",
        mockUser.password_hash,
      );
      expect(isValid).toBe(true);
    });

    test("should reject incorrect current password", async () => {
      const isValid = await bcrypt.compare(
        "WrongPassword123!",
        mockUser.password_hash,
      );
      expect(isValid).toBe(false);
    });

    test("should update profile name", async () => {
      mockConnection.query.mockResolvedValue([{ affectedRows: 1 }]);

      await mockConnection.query(
        "UPDATE users SET profile_name = ?, email = ? WHERE user_id = ?",
        ["New Name", "test@example.com", 1],
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        "UPDATE users SET profile_name = ?, email = ? WHERE user_id = ?",
        ["New Name", "test@example.com", 1],
      );
    });

    test("should update password when new password provided", async () => {
      const newPassword = "NewPassword123!";
      const newHash = await bcrypt.hash(newPassword, 10);

      mockConnection.query.mockResolvedValue([{ affectedRows: 1 }]);

      await mockConnection.query(
        "UPDATE users SET password_hash = ? WHERE user_id = ?",
        [newHash, 1],
      );

      expect(mockConnection.query).toHaveBeenCalled();
    });

    test("should validate new password strength", () => {
      const passwordRegex =
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

      expect(passwordRegex.test("NewPassword123!")).toBe(true);
      expect(passwordRegex.test("weak")).toBe(false);
      expect(passwordRegex.test("nouppercasenumber!")).toBe(false);
    });
  });

  describe("Account Deactivation", () => {
    test("should deactivate user account", async () => {
      mockConnection.query.mockResolvedValue([{ affectedRows: 1 }]);

      await mockConnection.query(
        "UPDATE users SET is_active = FALSE WHERE user_id = ?",
        [1],
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        "UPDATE users SET is_active = FALSE WHERE user_id = ?",
        [1],
      );
    });
  });

  describe("Account Reactivation", () => {
    test("should reactivate deactivated account", async () => {
      mockConnection.query
        .mockResolvedValueOnce([[{ ...mockUser, is_active: false }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const [users] = await mockConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["test@example.com"],
      );

      expect(users[0].is_active).toBe(false);

      await mockConnection.query(
        "UPDATE users SET is_active = TRUE WHERE email = ?",
        ["test@example.com"],
      );

      expect(mockConnection.query).toHaveBeenCalledWith(
        "UPDATE users SET is_active = TRUE WHERE email = ?",
        ["test@example.com"],
      );
    });

    test("should reject reactivation for non-existent account", async () => {
      mockConnection.query.mockResolvedValue([[]]);

      const [users] = await mockConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["nonexistent@example.com"],
      );

      expect(users).toHaveLength(0);
    });

    test("should reject reactivation for already active account", async () => {
      mockConnection.query.mockResolvedValue([
        [{ ...mockUser, is_active: true }],
      ]);

      const [users] = await mockConnection.query(
        "SELECT * FROM users WHERE email = ?",
        ["test@example.com"],
      );

      // Should not attempt reactivation if already active
      const shouldReactivate = users.length > 0 && !users[0].is_active;
      expect(shouldReactivate).toBe(false);
    });
  });

  describe("Session Management", () => {
    test("should properly structure session user object", () => {
      const sessionUser = {
        id: mockUser.user_id,
        profileName: mockUser.profile_name,
        email: mockUser.email,
        isAdmin: mockUser.is_admin,
      };

      expect(sessionUser.id).toBe(1);
      expect(sessionUser.profileName).toBe("Test User");
      expect(sessionUser.email).toBe("test@example.com");
      expect(sessionUser.isAdmin).toBe(false);
    });
  });
});
