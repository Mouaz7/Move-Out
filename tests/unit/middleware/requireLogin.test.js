const requireLogin = require("../../middleware/requireLogin");

describe("requireLogin Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      session: {},
    };
    res = {
      redirect: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should call next() when user is authenticated", () => {
    // Arrange
    req.session.user = {
      id: 1,
      email: "test@example.com",
      profileName: "Test User",
    };

    // Act
    requireLogin(req, res, next);

    // Assert
    expect(req.user).toEqual(req.session.user);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.redirect).not.toHaveBeenCalled();
  });

  test("should redirect to login when user is not authenticated", () => {
    // Arrange - req.session.user is undefined

    // Act
    requireLogin(req, res, next);

    // Assert
    expect(res.redirect).toHaveBeenCalledWith("/move/login");
    expect(next).not.toHaveBeenCalled();
  });

  test("should redirect to login when session is missing", () => {
    // Arrange
    req.session = null;

    // Act
    requireLogin(req, res, next);

    // Assert
    expect(res.redirect).toHaveBeenCalledWith("/move/login");
    expect(next).not.toHaveBeenCalled();
  });

  test("should redirect to login when session.user is null", () => {
    // Arrange
    req.session.user = null;

    // Act
    requireLogin(req, res, next);

    // Assert
    expect(res.redirect).toHaveBeenCalledWith("/move/login");
    expect(next).not.toHaveBeenCalled();
  });

  test("should set req.user to session.user when authenticated", () => {
    // Arrange
    const mockUser = {
      id: 42,
      email: "admin@example.com",
      profileName: "Admin User",
      isAdmin: true,
    };
    req.session.user = mockUser;

    // Act
    requireLogin(req, res, next);

    // Assert
    expect(req.user).toEqual(mockUser);
    expect(req.user.id).toBe(42);
    expect(req.user.isAdmin).toBe(true);
  });
});
