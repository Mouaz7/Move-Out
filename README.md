<p align="center">
  <img src="public/style/images/labe1.png" alt="MoveOut Logo" width="120" height="120">
</p>

<h1 align="center">MoveOut</h1>

<p align="center">
  <strong>Professional Moving Box Management System</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#security">Security</a> •
  <a href="#installation">Installation</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#api">API</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Security-A--92%25-brightgreen" alt="Security Score">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

<p align="center">
  <a href="https://move-out-i4d2.onrender.com/move/about">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-move--out--i4d2.onrender.com-00C853?style=for-the-badge" alt="Live Demo">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-✅_Online_&_Tested-success" alt="Status">
  <img src="https://img.shields.io/badge/Uptime-24%2F7-blue" alt="Uptime">
  <img src="https://img.shields.io/badge/Deployed-Render.com-46E3B7?logo=render" alt="Deployed on Render">
</p>

---

## 📋 Overview

**MoveOut** is a full-stack web application designed to simplify the moving process. Create digital labels for your moving boxes, generate QR codes for instant access, and securely share box contents with family, friends, or moving companies.

### Why MoveOut?

- 📦 **Never lose track** of what's in your boxes
- 📱 **Scan QR codes** for instant box identification
- 🔒 **PIN protection** for sensitive items
- 🌐 **Access anywhere** - cloud-based solution
- 🎨 **Premium SaaS UI** - Minimalist, high-end design with tailored Navy & Gold branding
- ✨ **Enhanced Typography** - "Poppins" font integration for a clean, modern aesthetic
- 🌍 **Multi-language** - Swedish and English support

---

## ✨ Features

### Box Management

| Feature                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| **Create Boxes**           | Add boxes with custom names and labels       |
| **Multiple Content Types** | Text, images, or audio descriptions          |
| **Custom Labels**          | Choose from preset labels or upload your own |
| **Label Types**            | Normal, Fragile, or Hazard classifications   |
| **QR Codes**               | Auto-generated for each box                  |

### User Features

| Feature                | Description                                  |
| ---------------------- | -------------------------------------------- |
| **Email Registration** | Secure sign-up with verification code        |
| **Google OAuth**       | One-click sign-in with Google                |
| **Profile Management** | Update name, password, or deactivate account |
| **Password Reset**     | Secure recovery via email                    |
| **Auto-deactivation**  | Inactive accounts deactivated after 30 days  |
| **Language Toggle**    | Switch between Swedish and English           |

### Sharing & Privacy

| Feature            | Description                              |
| ------------------ | ---------------------------------------- |
| **Public Boxes**   | Share via QR code link                   |
| **Private Boxes**  | 6-digit PIN protection                   |
| **Secure Sharing** | Share with movers without account access |

### Admin Panel

| Feature              | Description                              |
| -------------------- | ---------------------------------------- |
| **User Management**  | View, activate, deactivate, delete users |
| **Session Control**  | Monitor and terminate active sessions    |
| **Marketing Emails** | Send announcements to all users          |

---

## 🔒 Security

### Security Score: **92/100** (A-)

MoveOut implements enterprise-grade security measures:

| Protection            | Implementation                               | Status |
| --------------------- | -------------------------------------------- | ------ |
| **CSRF Protection**   | Session-based tokens on all 16 forms         | ✅     |
| **XSS Prevention**    | CSP with nonces, Helmet.js                   | ✅     |
| **SQL Injection**     | Parameterized queries                        | ✅     |
| **Password Security** | bcrypt with salt (rounds: 10)                | ✅     |
| **Session Security**  | PostgreSQL store, httpOnly, secure, sameSite | ✅     |
| **Rate Limiting**     | 100 requests per 15 minutes                  | ✅     |
| **HTTPS Redirect**    | Automatic in production                      | ✅     |
| **Security Headers**  | Helmet.js + custom headers                   | ✅     |

### Security Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-xxx'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 🛠️ Tech Stack

### Backend

| Technology       | Purpose             |
| ---------------- | ------------------- |
| **Node.js 18+**  | Runtime environment |
| **Express 4.21** | Web framework       |
| **Passport.js**  | Authentication      |
| **bcrypt**       | Password hashing    |
| **Nodemailer**   | Email delivery      |
| **node-cron**    | Scheduled tasks     |

### Frontend

| Technology       | Purpose                    |
| ---------------- | -------------------------- |
| **EJS**          | Template engine            |
| **CSS3**         | Styling with glassmorphism |
| **Font Awesome** | Icons                      |
| **JavaScript**   | Client-side interactivity  |

### Database

| Environment | Database              |
| ----------- | --------------------- |
| Development | SQLite (local file)   |
| Production  | PostgreSQL (Supabase) |

### Security

| Package                | Purpose                       |
| ---------------------- | ----------------------------- |
| **helmet**             | HTTP security headers         |
| **express-rate-limit** | Rate limiting                 |
| **express-validator**  | Input validation              |
| **cors**               | Cross-origin resource sharing |
| **connect-pg-simple**  | PostgreSQL session store      |

---

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Mouaz7/Move-Out.git
cd Move-Out

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output to SESSION_SECRET in .env

# 5. Start development server
npm run dev
```

### Environment Configuration

```bash
# .env file

# Environment
NODE_ENV=development

# Session (REQUIRED - generate a unique secret!)
SESSION_SECRET=your-64-character-hex-string

# Email (REQUIRED for registration)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:1338/auth/google/callback

# Production Database
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_DB_URL=postgresql://user:pass@host:port/db

# Admin User
ADMIN_EMAIL=admin@moveout.com
ADMIN_PASSWORD=Admin@123
```

### Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Search for "App passwords"
4. Generate a new app password for "Mail"
5. Use this 16-character password as `EMAIL_PASS`

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate unique `SESSION_SECRET`
- [ ] Configure Supabase database connection
- [ ] Set up Google OAuth with production URLs
- [ ] Configure `ALLOWED_ORIGINS` for CORS
- [ ] Enable HTTPS
- [ ] Update `GOOGLE_CALLBACK_URL` to production URL

### Deploy to Google Cloud Run

```bash
# Build and deploy
gcloud run deploy moveout \
  --source . \
  --platform managed \
  --region europe-north1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production"
```

### Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Deploy to Render

1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy automatically on push

---

## 📁 Project Structure

```
Move-Out/
├── config/
│   └── db/
│       ├── database.js      # Database abstraction layer
│       ├── passport.js      # Google OAuth configuration
│       ├── sqlitePool.js    # SQLite for development
│       └── supabase.js      # Supabase for production
├── middleware/
│   ├── csrf.js              # CSRF protection
│   ├── isAdmin.js           # Admin authorization
│   ├── rateLimiter.js       # Rate limiting
│   ├── requireLogin.js      # Authentication guard
│   ├── security.js          # Helmet & security headers
│   └── validator.js         # Input validation rules
├── routes/
│   ├── admin.js             # Admin panel routes
│   ├── auth.js              # Authentication routes
│   ├── authRoutes.js        # Google OAuth routes
│   ├── boxes.js             # Box CRUD operations
│   ├── profile.js           # User profile routes
│   └── public.js            # Public pages & QR access
├── src/
│   └── cli.js               # Core business logic
├── utils/
│   └── validation.js        # Shared validation utilities
├── views/
│   ├── pages/               # EJS page templates
│   └── partials/            # Reusable components
├── public/
│   ├── js/                  # Client-side JavaScript
│   └── style/               # CSS and images
├── tests/
│   ├── integration/         # Integration tests
│   └── unit/                # Unit tests
├── index.js                 # Application entry point
├── package.json             # Dependencies
├── docs/                    # Documentation
│   ├── CI_CD.md             # CI/CD pipeline guide
│   ├── CV_SETUP.md          # CV download setup
│   ├── DEPLOYMENT.md        # Deployment guide
│   └── SETUP_SUMMARY.md     # Setup overview
└── .env.example             # Environment template
```

---

## 📚 Documentation

Comprehensive documentation is available in the `/docs` folder:

| Document                               | Description                                      |
| -------------------------------------- | ------------------------------------------------ |
| [CI/CD Pipeline](docs/CI_CD.md)        | GitHub Actions workflows, pipeline configuration |
| [CV Setup](docs/CV_SETUP.md)           | How to configure CV download from Supabase       |
| [Deployment](docs/DEPLOYMENT.md)       | Deployment guide for Render, Railway, Cloud Run  |
| [Setup Summary](docs/SETUP_SUMMARY.md) | CI/CD and testing setup overview                 |

---

## 🔌 API Reference

### Authentication

| Method | Endpoint                | Description        |
| ------ | ----------------------- | ------------------ |
| `GET`  | `/move/login`           | Login page         |
| `POST` | `/move/login`           | Authenticate user  |
| `GET`  | `/move/register`        | Registration page  |
| `POST` | `/move/register`        | Create account     |
| `GET`  | `/move/logout`          | End session        |
| `POST` | `/move/verify-code`     | Verify email       |
| `POST` | `/move/forgot-password` | Request reset code |
| `POST` | `/move/reset-password`  | Set new password   |

### Boxes

| Method | Endpoint                 | Description       |
| ------ | ------------------------ | ----------------- |
| `GET`  | `/move/boxes`            | List user's boxes |
| `GET`  | `/move/boxes/create`     | Create box form   |
| `POST` | `/move/boxes/create`     | Create new box    |
| `GET`  | `/move/boxes/view/:id`   | View box details  |
| `GET`  | `/move/boxes/edit/:id`   | Edit box form     |
| `POST` | `/move/boxes/edit/:id`   | Update box        |
| `POST` | `/move/boxes/delete/:id` | Delete box        |

### QR Access

| Method | Endpoint                             | Description       |
| ------ | ------------------------------------ | ----------------- |
| `GET`  | `/move/boxes/qr/:token`              | Access box via QR |
| `POST` | `/move/boxes/qr/validate-pin/:token` | Validate PIN      |

### Admin

| Method | Endpoint                     | Description              |
| ------ | ---------------------------- | ------------------------ |
| `GET`  | `/move/admin/users`          | List all users           |
| `GET`  | `/move/admin/sessions`       | Active sessions          |
| `POST` | `/move/admin/toggle-status`  | Activate/deactivate user |
| `POST` | `/move/admin/delete`         | Delete user              |
| `POST` | `/move/admin/kick-session`   | Terminate session        |
| `POST` | `/move/admin/send-marketing` | Send marketing email     |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Test Results

```
Test Suites: 4 passed, 4 total
Tests:       47 passed, 47 total
```

### Test Coverage

| Test Suite              | Tests | Description                              |
| ----------------------- | ----- | ---------------------------------------- |
| **Password Validation** | 7     | Strong password requirements             |
| **Authentication**      | 12    | Login, register, verify, lockout         |
| **Profile**             | 8     | Profile management, update, deactivation |
| **Boxes**               | 20    | CRUD operations, file uploads            |

### Security Tests

| Test                              | Description                                 |
| --------------------------------- | ------------------------------------------- |
| **Account Lockout**               | Locks account after 5 failed login attempts |
| **Lockout Duration**              | Account stays locked for 15 minutes         |
| **Failed Attempt Tracking**       | Tracks and displays remaining attempts      |
| **Successful Login Reset**        | Resets counter on successful login          |
| **Deactivated Account Rejection** | Prevents login for deactivated accounts     |

---

## 🎨 Screenshots

### Login Page

Modern glassmorphism design with a premium Navy & Gold color palette, featuring Google OAuth support.

### Dashboard

View all your boxes with custom labels and quick actions.

### Box Details

See content, QR code, and sharing options in a clean, uncluttered layout.

### Admin Panel

Manage users and monitor active sessions via a structured, minimalist SaaS-style table interface featuring crisp status badges and robust data organization.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open** a Pull Request

### Code Style

- Use ESLint with recommended rules
- Follow existing code patterns
- Add tests for new features
- Update documentation as needed

---

## 👨‍💻 Author

<p align="center">
  <strong>Mouaz Naji</strong><br>
  Full-Stack Developer
</p>

<p align="center">
  <a href="https://github.com/Mouaz7">
    <img src="https://img.shields.io/badge/GitHub-Mouaz7-181717?logo=github" alt="GitHub">
  </a>
</p>

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ in Sweden
</p>
