// Mock the database pool before requiring isAdmin
jest.mock("../../../config/db/mysqlPool", () => ({
  getConnection: jest.fn(),
}));

const isAdmin = require("../../../middleware/isAdmin");
const pool = require("../../../config/db/mysqlPool");

describe("isAdmin Middleware", () => {
  let req, res, next, mockConnection;

  beforeEach(() => {
    req = {
      session: {
        user: {},
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();

    mockConnection = {
      query: jest.fn(),
      release: jest.fn(),
    };

    pool.getConnection.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should call next() when user is admin (from session)", async () => {
    // Arrange
    req.session.user = {
      id: 1,
      isAdmin: true,
    };

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(pool.getConnection).not.toHaveBeenCalled(); // Should not query DB if already in session
  });

  test("should call next() when user is admin (from database)", async () => {
    // Arrange
    req.session.user = {
      id: 1,
      isAdmin: false, // Not set in session
    };

    mockConnection.query.mockResolvedValue([
      [{ is_admin: true }], // Database returns admin status
    ]);

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(pool.getConnection).toHaveBeenCalledTimes(1);
    expect(mockConnection.query).toHaveBeenCalledWith(
      "SELECT is_admin FROM users WHERE user_id = ?",
      [1]
    );
    expect(req.session.user.isAdmin).toBe(true); // Should update session
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  test("should deny access when user is not admin", async () => {
    // Arrange
    req.session.user = {
      id: 1,
      isAdmin: false,
    };

    mockConnection.query.mockResolvedValue([
      [{ is_admin: false }], // User is not admin
    ]);

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Access Denied"));
    expect(next).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });

  test("should deny access when user not found in database", async () => {
    // Arrange
    req.session.user = {
      id: 999,
      isAdmin: false,
    };

    mockConnection.query.mockResolvedValue([
      [], // No user found
    ]);

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Access Denied"));
    expect(next).not.toHaveBeenCalled();
  });

  test("should deny access when user is not logged in", async () => {
    // Arrange
    req.session = {}; // No user in session

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Please log in"));
    expect(next).not.toHaveBeenCalled();
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test("should handle database errors gracefully", async () => {
    // Arrange
    req.session.user = {
      id: 1,
      isAdmin: false,
    };

    const dbError = new Error("Database connection failed");
    mockConnection.query.mockRejectedValue(dbError);

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Server Error"));
    expect(next).not.toHaveBeenCalled();
    expect(mockConnection.release).toHaveBeenCalledTimes(1); // Should release even on error
  });

  test("should release connection even if query succeeds", async () => {
    // Arrange
    req.session.user = {
      id: 1,
      isAdmin: false,
    };

    mockConnection.query.mockResolvedValue([[{ is_admin: true }]]);

    // Act
    await isAdmin(req, res, next);

    // Assert
    expect(mockConnection.release).toHaveBeenCalledTimes(1);
  });
});
