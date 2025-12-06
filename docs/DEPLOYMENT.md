# Deployment Guide - Google Cloud Run + Supabase

Complete guide for deploying Move-Out to Google Cloud Run with Supabase PostgreSQL database.

## Prerequisites

- ✅ Google Cloud account with billing enabled
- ✅ Supabase account (free tier available)
- ✅ Google Cloud SDK installed (`gcloud`)
- ✅ Docker installed locally (for testing)
- ✅ Git for version control

## Part 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New project"**
3. Fill in the details:
   - **Project name**: Move-Out
   - **Database password**: (save this securely)
   - **Region**: Europe (or closest to your users)
4. Click **"Create new project"**
5. Wait 2-3 minutes for project creation

### Step 2: Run Database Migration

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the contents of `sql/supabase-migration.sql`
4. Paste into the SQL editor
5. Click **"Run"**
6. Verify success message appears

### Step 3: Get Connection Credentials

1. Go to **Project Settings** → **Database**
2. Copy and save:
   - **Connection string** (Pooler mode recommended)
   - **Host**, **Database name**, **Port**, **User**
3. Go to **Project Settings** → **API**
4. Copy and save:
   - **Project URL** (SUPABASE_URL)
   - **anon/public key** (SUPABASE_ANON_KEY)

## Part 2: Google Cloud Run Setup

### Step 1: Install Google Cloud SDK

**Windows:**

```powershell
# Download installer from:
https://cloud.google.com/sdk/docs/install
```

**Linux/Mac:**

```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Step 2: Initialize gcloud

```bash
# Login to Google Cloud
gcloud auth login

# Create new project or select existing
gcloud projects create moveout-prod --name="MoveOut Production"

# Set project
gcloud config set project moveout-prod

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.gcr.io
gcloud services enable cloudbuild.googleapis.com
```

### Step 3: Configure Environment Variables

Create a `.env.production` file:

```bash
NODE_ENV=production
SESSION_SECRET=<your-random-secret>
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_DB_URL=postgresql://postgres:<password>@db.xxxxx.supabase.co:5432/postgres
GOOGLE_CLIENT_ID=<your-google-oauth-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-secret>
EMAIL_USER=<your-gmail>
EMAIL_PASS=<your-app-password>
ALLOWED_ORIGINS=https://moveout-xxxxx.run.app
```

## Part 3: Build and Deploy

### Option A: Deploy with gcloud (Recommended)

```bash
# Deploy to Cloud Run
gcloud run deploy moveout \
  --source . \
  --platform managed \
  --region europe-north1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars SUPABASE_URL=<your-url> \
  --set-env-vars SUPABASE_ANON_KEY=<your-key> \
  --set-env-vars SUPABASE_DB_URL=<your-connection-string> \
  --set-env-vars SESSION_SECRET=<your-secret> \
  --memory 512Mi \
  --timeout 300

# Follow prompts and wait for deployment
```

### Option B: Deploy with Cloud Build

```bash
# Submit build
gcloud builds submit --config cloudbuild.yaml

# Set environment variables via console
# Go to Cloud Run → moveout → Edit & Deploy New Revision
# Add environment variables from .env.production
```

### Step 4: Configure Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service moveout \
  --domain yourdomain.com \
  --region europe-north1
```

## Part 4: Verification

### Test Health Endpoint

```bash
# Get Cloud Run URL
gcloud run services describe moveout --region europe-north1 --format 'value(status.url)'

# Test health endpoint
curl https://moveout-xxxxx.run.app/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T...",
  "uptime": 123.45,
  "database": {
    "status": "healthy",
    "database": "PostgreSQL",
    "environment": "production"
  }
}
```

### Test Application

1. Visit `https://moveout-xxxxx.run.app/move`
2. Register a new account
3. Create a box with QR code
4. Verify email functionality
5. Test QR code scanning

## Part 5: Monitoring

### View Logs

```bash
# Stream logs
gcloud run services logs tail moveout --region europe-north1

# View logs in console
# Go to Cloud Run → moveout → Logs
```

### Set Up Alerts

1. Go to **Cloud Console** → **Monitoring** → **Alerting**
2. Create alert for:
   - High error rate
   - High latency
   - Low health check success rate

## Troubleshooting

### Database Connection Issues

```bash
# Test Supabase connection
psql "postgresql://postgres:<password>@db.xxxxx.supabase.co:5432/postgres"

# Verify tables exist
\dt
```

### Missing Environment Variables

```bash
# List current env vars
gcloud run services describe moveout \
  --region europe-north1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

### Memory Issues

```bash
# Increase memory
gcloud run services update moveout \
  --memory 1Gi \
  --region europe-north1
```

## Cost Optimization

### Google Cloud Run (Free Tier)

- 2 million requests/month free
- 360,000 GB-seconds of memory free
- 180,000 vCPU-seconds free

### Supabase (Free Tier)

- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- Unlimited API requests

## Security Checklist

- [x] HTTPS enabled (automatic on Cloud Run)
- [x] Environment variables secured
- [x] Database credentials encrypted
- [x] Rate limiting enabled
- [x] Helmet security headers configured
- [x] CORS properly configured
- [x] Session cookies secure
- [ ] Regular security updates
- [ ] Backup strategy implemented

## Next Steps

1. Set up continuous deployment (GitHub Actions)
2. Configure database backups
3. Set up monitoring and alerting
4. Optimize performance
5. Add CDN for static assets
