# Move-Out Testing Guide

## Overview

This document explains the testing infrastructure for the Move-Out application, including how to run tests, what is tested, and how to add new tests.

## Test Infrastructure

### Testing Stack

- **Jest**: Test framework and assertion library
- **Supertest**: HTTP integration testing
- **Mock Functions**: Database and external service mocking

### Directory Structure

```
tests/
├── setup.js                    # Global test configuration
├── mocks/
│   └── dbMock.js              # Database mock helpers
├── unit/
│   ├── middleware/            # Middleware tests
│   │   ├── requireLogin.test.js
│   │   ├── isAdmin.test.js
│   │   └── rateLimiter.test.js
│   └── routes/                # Route handler tests
│       └── auth.test.js
└── security/                  # Security-focused tests
    └── sqlInjection.test.js
```

## Running Tests

### All Tests

```bash
npm test
```

Runs all tests with coverage report.

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Security tests only
npm run test:security

# Watch mode (re-runs on file changes)
npm run test:watch
```

### Single Test File

```bash
npm test -- tests/unit/middleware/requireLogin.test.js
```

## Test Coverage

### Current Coverage

Run `npm test` to see coverage report. Coverage files are generated in `coverage/` directory.

View HTML coverage report:

```bash
# Open coverage/lcov-report/index.html in browser
```

### Coverage Goals

- **Lines**: > 80%
- **Functions**: > 75%
- **Branches**: > 70%
- **Critical Security Functions**: 100%

## Writing Tests

### Test Template

```javascript
describe("Feature Name", () => {
  let mockDependencies;

  beforeEach(() => {
    // Setup before each test
    mockDependencies = {};
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });

  test("should do something specific", () => {
    // Arrange: Setup test data
    const input = "test";

    // Act: Execute the code
    const result = functionUnderTest(input);

    // Assert: Verify results
    expect(result).toBe("expected");
  });
});
```

### Middleware Tests

Example from `requireLogin.test.js`:

```javascript
const requireLogin = require("../../middleware/requireLogin");

describe("requireLogin Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: {} };
    res = { redirect: jest.fn() };
    next = jest.fn();
  });

  test("should call next() when user is authenticated", () => {
    req.session.user = { id: 1, email: "test@example.com" };

    requireLogin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
```

### Route Tests with Supertest

Example from `auth.test.js`:

```javascript
const request = require("supertest");
const app = require("../../index"); // Your Express app

describe("POST /move/login", () => {
  test("should login successfully", async () => {
    const response = await request(app).post("/move/login").send({
      email: "test@example.com",
      psw: "TestPass123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });
});
```

### Database Mocking

Use the helper functions from `tests/mocks/dbMock.js`:

```javascript
const {
  mockPool,
  mockConnection,
  createMockUser,
} = require("../../tests/mocks/dbMock");

// Create mock user data
const mockUser = createMockUser({
  email: "test@example.com",
  is_admin: true,
});

// Mock database query
mockConnection.query.mockResolvedValue([[mockUser]]);
```

## Test Best Practices

### 1. Test Naming

- **Descriptive**: `should reject login with invalid password`
- **Not**: `test login`

### 2. AAA Pattern

Always structure tests with:

- **Arrange**: Set up test data and mocks
- **Act**: Execute the code under test
- **Assert**: Verify the results

### 3. Isolation

- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Don't rely on test execution order

### 4. Mock External Dependencies

- Database connections
- External APIs (nodemailer, etc.)
- File system operations
- Third-party services

### 5. Test Edge Cases

- Valid inputs
- Invalid inputs
- Boundary conditions
- Error conditions
- Empty/null values

## Common Testing Scenarios

### Testing Authentication

```javascript
test("should create session on successful login", async () => {
  const response = await request(app)
    .post("/move/login")
    .send({ email: "test@example.com", psw: "TestPass123!" });

  expect(response.headers["set-cookie"]).toBeDefined();
});
```

### Testing Validation

```javascript
test("should reject weak passwords", async () => {
  const response = await request(app)
    .post("/move/register")
    .send({ email: "test@example.com", psw: "weak" });

  expect(response.status).toBe(400);
  expect(response.body.errorMessage).toContain("Password must");
});
```

### Testing Database Errors

```javascript
test("should handle database errors gracefully", async () => {
  mockConnection.query.mockRejectedValue(new Error("DB Error"));

  const response = await request(app).post("/move/login").send({...});

  expect(response.status).toBe(500);
});
```

## Debugging Tests

### Enable Console Output

Comment out console mocking in `tests/setup.js`:

```javascript
// global.console = { ...console, log: jest.fn() };
```

### Run Single Test

```bash
npm test -- -t "specific test name"
```

### Verbose Output

```bash
npm test -- --verbose
```

### Detect Open Handles

```bash
npm test -- --detectOpenHandles
```

## Continuous Integration

### Pre-commit

Run tests before committing:

```bash
npm test
```

### CI/CD Pipeline

Example GitHub Actions workflow:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

## Adding New Tests

### For New Routes

1. Create test file in `tests/unit/routes/`
2. Mock dependencies (database, services)
3. Test all HTTP methods and status codes
4. Test validation and error cases

### For New Middleware

1. Create test file in `tests/unit/middleware/`
2. Mock req, res, next
3. Test all code paths
4. Test error handling

### For Security Features

1. Create test file in `tests/security/`
2. Test against known attack vectors
3. Verify protection mechanisms
4. Document security test cases

## Troubleshooting

### Tests Hang

- Check for missing `async/await`
- Look for unclosed connections
- Use `jest.setTimeout(10000)` for slow tests

### Mocks Not Working

- Ensure mocks are defined before `require()`
- Clear mocks between tests: `jest.clearAllMocks()`
- Check mock implementation returns correct format

### Coverage NotIncluded

- Add files to `collectCoverageFrom` in `jest.config.js`
- Ensure files are being required in tests

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
