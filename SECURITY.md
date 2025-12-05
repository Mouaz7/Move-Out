# Security Policy

## Overview

This document outlines the security measures implemented in the MoveOut application to protect user data and prevent common web vulnerabilities.

## Security Measures Implemented

### 1. Authentication & Session Management

- **Password Requirements**: Enforced strong password policy (minimum 8 characters, uppercase, number, special character)
- **Secure Sessions**: Session-based authentication with secure cookies
  - `httpOnly`: Prevents XSS attacks from stealing cookies
  - `sameSite: strict`: Prevents CSRF attacks
  - `secure`: Enabled in production (HTTPS only)
- **Session Storage**: MySQL-based session store for persistence and scalability
- **Password Hashing**: bcrypt with salt rounds (10) for secure password storage

### 2. Input Validation & Sanitization

- **Server-Side Validation**: All user inputs validated using express-validator
- **Email Validation**: RFC-compliant email format checking
- **Sanitization**: HTML escaping and normalization on all text inputs
- **Password Validation**: Regex-based complexity requirements enforced server-side
- **File Upload Validation**: MIME type whitelist, extension validation, filename sanitization

### 3. SQL Injection Prevention

- **Parameterized Queries**: All database queries use parameterized statements (?, [params])
- **No String Concatenation**: Never concat user input directly into SQL queries
- **ORM Pattern**: Consistent use of mysql2/promise with prepared statements

### 4. CSRF Protection

- **CSRF Tokens**: Every form includes a unique token validated on submission
- **SameSite Cookies**: Additional CSRF protection via cookie settings
- **Token Validation**: Server validates tokens before processing POST requests

### 5. Rate Limiting

Rate limits are enforced to prevent brute force attacks and abuse:

- **Login**: 5 attempts per 15 minutes per IP
- **Registration**: 3 attempts per hour per IP
- **Verification**: 5 attempts per 15 minutes per IP
- **General API**: 100 requests per 15 minutes per IP

### 6. File Upload Security

- **MIME Type Whitelist**: Only safe file types allowed (images, PDFs, documents)
- **File Size Limits**: Maximum 10MB per file
- **Filename Sanitization**: Path traversal prevention, random filenames
- **No Executable Files**: .exe, .php, .sh, etc. blocked
- **Separate Directories**: User uploads isolated from application code

### 7. Security Headers

Using Helmet.js to set secure HTTP headers:

- **Content-Security-Policy**: Prevents XSS by controlling resource loading
- **X-Frame-Options**: Prevents clickjacking (DENY)
- **X-Content-Type-Options**: Prevents MIME sniffing (nosniff)
- **Strict-Transport-Security**: Forces HTTPS in production
- **Referrer-Policy**: Controls referrer information leakage

### 8. Error Handling

- **No Stack Traces**: Stack traces only shown in development mode
- **Generic Error Messages**: Production errors don't expose system details
- **CSRF Error Handling**: User-friendly messages for token validation failures
- **Logging**: Errors logged server-side with context for debugging

### 9. Environment Variables

- **Required Variables**: SESSION_SECRET must be set (no fallback)
- **Separate Configs**: Development and production use different secrets
- **.env.example**: Template provided, actual .env gitignored
- **Validation**: Application validates required env vars on startup

## Required Environment Variables

Create a `.env` file with the following variables:

```bash
# Session Security (REQUIRED)
SESSION_SECRET=your_random_64_char_secret

# Database in config/db/move.json

# Email Service
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Environment
NODE_ENV=development
BASE_URL=http://localhost:1338
```

Generate a secure SESSION_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Security Best Practices

### For Developers

1. **Never commit .env files** - Always add to .gitignore
2. **Use parameterized queries** - Never concatenate user input into SQL
3. **Validate all inputs** - Both client and server-side
4. **Keep dependencies updated** - Regularly run `npm audit` and `npm update`
5. **Test security** - Run security tests before deploying: `npm run test:security`
6. **Review changes** - Never bypass security middleware

### For Deployment

1. **Enable HTTPS** - Set `NODE_ENV=production` to enable secure cookies
2. **Use strong secrets** - Generate new SESSION_SECRET for each environment
3. **Configure firewall** - Limit database access to application server only
4. **Monitor logs** - Set up logging and monitoring for security events
5. **Regular backups** - Implement automated database backups
6. **Update regularly** - Keep Node.js, npm packages, and OS updated

## Reporting Security Issues

If you discover a security vulnerability, please email [your-email@example.com] with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Please do not** open public issues for security vulnerabilities.

## Security Testing

Run the security test suite:

```bash
# All security tests
npm run test:security

# All tests with coverage
npm test
```

## Compliance

- **GDPR**: User data can be deleted on request (profile deactivation)
- **Password Storage**: Industry-standard bcrypt hashing
- **Data Minimization**: Only necessary user data collected
- **Right to Access**: Users can view and export their data

## Audit Log

| Date       | Change                                                 | Version |
| ---------- | ------------------------------------------------------ | ------- |
| 2025-12-05 | Initial security hardening implementation              | 1.0.0   |
| 2025-12-05 | Added rate limiting, CSRF protection, input validation | 1.0.0   |
| 2025-12-05 | Enhanced file upload security with MIME validation     | 1.0.0   |
| 2025-12-05 | Implemented security headers with Helmet               | 1.0.0   |

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
