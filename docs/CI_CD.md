# CI/CD Pipeline Documentation

## Overview

MoveOut uses **GitHub Actions** for continuous integration and deployment, with automated testing, security audits, and deployment to Render.com.

## Pipeline Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Test &      │    │      Build      │    │     Deploy      │
│      Lint       │───▶│   Verification  │───▶│   to Render     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│    Security     │    │    Coverage     │
│     Audit       │    │     Report      │
└─────────────────┘    └─────────────────┘
```

## Workflows

### Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

Runs on every push to `main` or `master` branches and on pull requests.

#### Jobs:

| Job                    | Description                     | Triggers              |
| ---------------------- | ------------------------------- | --------------------- |
| **Test & Lint**        | Runs Jest tests with coverage   | All pushes/PRs        |
| **Security Audit**     | `npm audit` for vulnerabilities | All pushes/PRs        |
| **Build Verification** | Validates app starts correctly  | After tests pass      |
| **Deploy to Render**   | Production deployment           | Only on `main` branch |

### Job Details

#### 1. Test & Lint

```yaml
steps:
  - Checkout code
  - Setup Node.js 18
  - Install dependencies (npm ci)
  - Run tests (npm test)
  - Upload coverage report
```

**Environment:**

- `NODE_ENV=test`
- `SESSION_SECRET=test-session-secret-for-ci`

#### 2. Security Audit

```yaml
steps:
  - Checkout code
  - Setup Node.js 18
  - Install dependencies
  - Run npm audit (audit-level=high)
```

**Note:** Continues even if non-critical issues are found.

#### 3. Build Verification

```yaml
steps:
  - Checkout code
  - Install production dependencies
  - Verify application starts (10 second timeout)
```

Ensures the app can start without errors.

#### 4. Deploy to Render

```yaml
steps:
  - Trigger Render deploy hook
```

**Requirements:**

- Only runs on `main` branch
- Only on push events (not PRs)
- Requires `RENDER_DEPLOY_HOOK_URL` secret

## Test Suite

### Test Structure

```
tests/
├── integration/
│   ├── auth.test.js       # Authentication tests (12 tests)
│   ├── boxes.test.js      # Box CRUD tests (20 tests)
│   └── profile.test.js    # Profile management tests (8 tests)
├── unit/
│   └── passwordValidation.test.js  # Password validation (7 tests)
└── setup.js               # Test configuration
```

### Running Tests Locally

```bash
# Run all tests with coverage
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Current Test Coverage

| Metric          | Value     |
| --------------- | --------- |
| **Test Suites** | 4 passed  |
| **Tests**       | 47 passed |
| **Coverage**    | 3.67%     |

### Test Coverage Goals

| Priority | Area                | Target |
| -------- | ------------------- | ------ |
| High     | Authentication      | 90%+   |
| High     | Password Validation | 100%   |
| Medium   | Box Operations      | 80%+   |
| Medium   | Profile Management  | 80%+   |

## GitHub Secrets Configuration

Configure these in: **Settings → Secrets and variables → Actions**

### Required Secrets

| Secret              | Description            | Required       |
| ------------------- | ---------------------- | -------------- |
| `SESSION_SECRET`    | Session encryption key | ✅ Yes         |
| `SUPABASE_URL`      | Supabase project URL   | For production |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | For production |

### For Auto-Deployment

| Secret                   | Description           | How to Get                                |
| ------------------------ | --------------------- | ----------------------------------------- |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy webhook | Render Dashboard → Settings → Deploy Hook |

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/Mouaz7/Move-Out.git
cd Move-Out

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run tests
npm test

# Start development server
npm run dev
```

### Pre-commit Checklist

Before pushing code:

- [ ] `npm test` passes
- [ ] No console errors
- [ ] Code follows existing patterns
- [ ] Documentation updated if needed

## Branch Strategy

### Main Branches

| Branch    | Purpose             | Deploys To              |
| --------- | ------------------- | ----------------------- |
| `main`    | Production code     | Render.com (production) |
| `develop` | Development/staging | Preview environments    |

### Feature Branches

```
feature/add-user-export
bugfix/fix-login-redirect
hotfix/security-patch
```

## Monitoring & Alerts

### Build Status

Check build status at: `https://github.com/Mouaz7/Move-Out/actions`

### Coverage Reports

Coverage reports are uploaded as artifacts after each test run:

- Available in Actions → Workflow Run → Artifacts → `coverage-report`

## Troubleshooting

### Pipeline Failures

| Error          | Solution                                             |
| -------------- | ---------------------------------------------------- |
| `npm ci` fails | Check `package-lock.json` is committed               |
| Tests timeout  | Increase Jest timeout in config                      |
| Build fails    | Check for syntax errors, run `node index.js` locally |
| Deploy fails   | Verify `RENDER_DEPLOY_HOOK_URL` is correct           |

### Local Test Issues

```bash
# Clear Jest cache
npx jest --clearCache

# Run specific test file
npm test -- tests/unit/passwordValidation.test.js

# Run tests with verbose output
npm test -- --verbose
```

## Maintenance

### Weekly Tasks

- [ ] Review failed builds
- [ ] Check dependency updates
- [ ] Monitor test coverage trends

### Monthly Tasks

- [ ] Run `npm audit fix`
- [ ] Update dependencies
- [ ] Review and clean up old branches

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Render.com Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
