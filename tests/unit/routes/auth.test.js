// Mock all security middleware FIRST before requiring anything
jest.mock("../../../middleware/csrfProtection", () => ({
  csrfProtection: (req, res, next) => next(),
  addCsrfToken: (req, res, next) => {
    res.locals.csrfToken = "test-token";
    next();
  },
}));

jest.mock("../../../middleware/securityHeaders", () => (req, res, next) => next());

jest.mock("../../../middleware/rateLimiter", () => ({
  loginLimiter: (req, res, next) => next(),
  registerLimiter: (req, res, next) => next(),
  verificationLimiter: (req, res, next) => next(),
  apiLimiter: (req, res, next) => next(),
}));

// Global mock pool and client for PostgreSQL
let mockGlobalPool;
let mockGlobalClient;

jest.mock("pg", () => ({
  Pool: jest.fn(() => mockGlobalPool),
}));

jest.mock("../../../config/db/database", () => ({
  pool: mockGlobalPool,
  getConnection: jest.fn(() => Promise.resolve(mockGlobalClient)),
  query: jest.fn(),
}));

jest.mock("bcrypt");
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn((options, callback) => {
      if (callback) callback(null, { messageId: "test" });
      return Promise.resolve({ messageId: "test" });
    }),
  })),
}));

const request = require("supertest");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");

// Initialize global mock pool BEFORE loading routes
mockGlobalClient = {
  query: jest.fn(),
  release: jest.fn(),
};

mockGlobalPool = {
  connect: jest.fn().mockResolvedValue(mockGlobalClient),
  query: jest.fn(),
};

// Re-mock with initialized values
jest.mock("../../../config/db/database", () => ({
  pool: {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
    query: jest.fn(),
  },
  getConnection: jest.fn(() => Promise.resolve({
    query: jest.fn(),
    release: jest.fn(),
  })),
  query: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "test", resave: false, saveUninitialized: false }));

// Mock render and redirect
app.use((req, res, next) => {
  res.render = function (view, data) {
    if (!res.statusCode || res.statusCode === 200) {
      res.status(200);
    }
    return res.json({ view, ...data });
  };
  next();
});

const indexRoutes = require("../../../routes/indexRoutes");
app.use("/move", indexRoutes);

describe("Authentication Routes", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  beforeEach(() => {
    bcrypt.genSalt = jest.fn();
    bcrypt.hash = jest.fn();
    bcrypt.compare = jest.fn();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("GET /move/register", () => {
    test("should render register page", async () => {
      const res = await request(app).get("/move/register");
      expect(res.status).toBe(200);
      expect(res.body.view).toBe("register");
    });
  });

  describe("GET /move/login", () => {
    test("should render login page", async () => {
      const res = await request(app).get("/move/login");
      expect(res.status).toBe(200);
      expect(res.body.view).toBe("login");
    });
  });

  describe("GET /move/logout", () => {
    test("should logout and redirect", async () => {
      const res = await request(app).get("/move/logout");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/move/login");
    });
  });

  describe("POST /move/register", () => {
    test("should reject weak password", async () => {
      const res = await request(app).post("/move/register").send({
        name: "Test User",
        email: "test@test.com",
        psw: "weak",
        psw_repeat: "weak",
      });
      expect(res.status).toBe(400);
    });

    test("should reject mismatched passwords", async () => {
      const res = await request(app).post("/move/register").send({
        name: "Test User",
        email: "test@test.com",
        psw: "TestPass123!",
        psw_repeat: "Different123!",
      });
      expect(res.status).toBe(400);
    });
  });
});
