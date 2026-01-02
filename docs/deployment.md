# Deployment Guide

This guide provides step-by-step instructions for deploying the Bus Ticket Booking System both locally and on cloud hosting services. The deployment process is divided into sections for Database, Backend, and Frontend.

## Quick Navigation

**Choose your deployment path:**

- 🏠 **[Local Deployment](#part-a-local-deployment)** - For development and testing on your local machine
  - Uses: Local PostgreSQL, localhost backend, localhost frontend
  - Best for: Development, testing, learning the system
- ☁️ **[Cloud Deployment](#part-b-cloud-deployment)** - For production deployment to the internet
  - Uses: NeonDB (Database), Render (Backend), Vercel (Frontend)
  - Best for: Production, staging, public access

**Technology Stack:**

- **Database:** PostgreSQL (Local) / NeonDB (Cloud)
- **Backend:** NestJS on Node.js
- **Frontend:** Next.js (React)
- **Language:** TypeScript

---

## Table of Contents

### Part A: Local Deployment

1. [Prerequisites](#prerequisites)
2. [Local Database Setup](#section-1-database-setup)
3. [Local Backend Setup](#section-2-backend-setup)
4. [Local Frontend Setup](#section-3-frontend-setup)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

### Part B: Cloud Deployment

7. [Cloud Prerequisites](#cloud-prerequisites)
8. [Database Setup (NeonDB)](#section-4-database-setup-neondb)
9. [Backend Deployment (Render)](#section-5-backend-deployment-render)
10. [Frontend Deployment (Vercel)](#section-6-frontend-deployment-vercel)
11. [Cloud Verification](#cloud-verification)
12. [Cloud Troubleshooting](#cloud-troubleshooting)

### Additional Resources

13. [Useful Commands](#useful-commands)
14. [Next Steps](#next-steps)
15. [Support](#support)

---

# Part A: Local Deployment

---

## Prerequisites

Before starting the deployment, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **PostgreSQL** (v14 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/)

Optional but recommended:

- **pgAdmin** or **DBeaver** for database management
- **Postman** or **Thunder Client** for API testing

---

## Section 1: Database Setup

### Step 1.1: Install PostgreSQL

1. Download and install PostgreSQL from the official website
2. During installation, remember the **superuser password** you set
3. Ensure PostgreSQL service is running

**Windows:**

```bash
# Check if PostgreSQL is running
pg_ctl status

# Start PostgreSQL if not running
pg_ctl start
```

**macOS/Linux:**

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql
```

### Step 1.2: Create Database

1. Open **pgAdmin** or connect via command line:

```bash
# Connect to PostgreSQL
psql -U postgres
```

2. Create a new database for the application:

```sql
-- Create the database
CREATE DATABASE bus_booking;

-- Verify database creation
\l
```

3. (Optional) Create a dedicated user for the application:

```sql
-- Create user
CREATE USER bus_admin WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bus_booking TO bus_admin;

-- Exit psql
\q
```

### Step 1.3: Database Configuration Notes

The application uses the following default connection settings:

- **Host:** localhost
- **Port:** 5432
- **Database Name:** bus_booking
- **Username:** postgres (or your custom user)
- **Password:** (set during PostgreSQL installation)

These values will be configured in the Backend `.env` file in the next section.

---

## Section 2: Backend Setup

### Step 2.1: Clone and Navigate to Backend

```bash
# If you haven't cloned the repository yet
git clone <repository-url>

# Navigate to backend directory
cd Bus-Ticket-Backend
```

### Step 2.2: Install Dependencies

```bash
# Install all required packages
npm install
```

**Note:** If you encounter any peer dependency warnings, you can safely ignore them or use:

```bash
npm install --legacy-peer-deps
```

### Step 2.3: Configure Environment Variables

Create a `.env` file in the backend root directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=bus_booking

# Database Connection Pool (Optional - defaults are fine for local)
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000
DB_REAP_INTERVAL=1000
DB_MAX_USES=7500

# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=development
PORT=3000

# ============================================
# FRONTEND URL
# ============================================
FRONTEND_URL=http://localhost:8000

# ============================================
# GOOGLE OAUTH (Optional - for social login)
# ============================================
# Get credentials from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# ============================================
# GOOGLE MAPS & GEMINI AI (Optional)
# ============================================
# Get API key from: https://console.cloud.google.com/
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-1.5-flash

# ============================================
# FACEBOOK OAUTH (Optional - for social login)
# ============================================
# Get credentials from: https://developers.facebook.com/
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback

# ============================================
# EMAIL CONFIGURATION (Required for notifications)
# ============================================
EMAIL_SERVICE=sendgrid
# Get API key from: https://sendgrid.com/
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=your_verified_sender@example.com

# ============================================
# PAYMENT GATEWAY - PAYOS (Required for payments)
# ============================================
# Get credentials from: https://payos.vn/
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
PAYOS_RETURN_URL=http://localhost:8000/payment/success
PAYOS_CANCEL_URL=http://localhost:8000/payment/cancel

# For testing without real payments
FORCE_TEST_PAYMENT=true

# ============================================
# CLOUDINARY (Required for image uploads)
# ============================================
# Get credentials from: https://cloudinary.com/
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ============================================
# BUILD CONFIGURATION
# ============================================
NPM_CONFIG_PRODUCTION=false
```

### Step 2.4: Database Migration and Seeding

1. **Synchronize Database Schema:**

```bash
# This will create all tables based on entities
npm run start:dev
```

The application will automatically synchronize the database schema on first run in development mode.

2. **Seed Initial Data (Optional but Recommended):**

```bash
# Seed the database with sample data
npm run seed:dev

# Validate the seeded data
npm run seed:validate
```

This will populate the database with:

- Sample bus operators
- Routes across Vietnam
- Bus schedules and trips
- Seat layouts
- And more...

### Step 2.5: Start the Backend Server

```bash
# Development mode with hot-reload
npm run start:dev

# Or standard start
npm run start

# Or production mode
npm run build
npm run start:prod
```

The backend server should now be running at `http://localhost:3000`

### Step 2.6: Verify Backend is Running

Open your browser or API client and navigate to:

- **API Documentation:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/

You should see the Swagger API documentation.

---

## Section 3: Frontend Setup

### Step 3.1: Navigate to Frontend Directory

```bash
# From the project root
cd ../Bus-Ticket-Frontend
```

### Step 3.2: Install Dependencies

```bash
# Install all required packages
npm install
```

### Step 3.3: Configure Environment Variables

Create a `.env` or `.env.local` file in the frontend root directory:

```env
# ============================================
# BACKEND API CONFIGURATION
# ============================================
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# ============================================
# OPTIONAL: ANALYTICS
# ============================================
# Add Vercel Analytics token if needed
# NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

**Important Notes:**

- The `NEXT_PUBLIC_` prefix is required for environment variables that need to be accessible in the browser
- Make sure the API URL matches your backend server address

### Step 3.4: Start the Frontend Development Server

```bash
# Start the Next.js development server
npm run dev
```

The frontend application should now be running at `http://localhost:8000`

### Step 3.5: Verify Frontend is Running

Open your browser and navigate to:

- **Homepage:** http://localhost:8000/

You should see the Bus Ticket Booking System homepage.

---

## Verification

### Complete System Check

1. **Database Connection:**
   - Check backend logs for successful database connection
   - Verify tables were created in PostgreSQL

2. **Backend API:**
   - Visit http://localhost:3000/api
   - Test a simple endpoint like `GET /trips`

3. **Frontend-Backend Integration:**
   - Open http://localhost:8000/
   - Try searching for trips
   - Check browser console for any errors

4. **Authentication Flow:**
   - Try registering a new user
   - Login with credentials
   - Verify JWT tokens are being set (check cookies in browser DevTools)

---

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Errors

**Error:** `ECONNREFUSED` or `Connection refused`

**Solution:**

- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if the database `bus_booking` exists
- Verify firewall settings allow connections to port 5432

#### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

Or change the port in backend `.env`:

```env
PORT=3001
```

#### Module Not Found Errors

**Error:** `Cannot find module 'xyz'`

**Solution:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### CORS Errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:**

- Verify `FRONTEND_URL` in backend `.env` matches your frontend URL
- Ensure `withCredentials: true` is set in frontend API configuration

#### TypeORM Synchronization Issues

**Error:** `QueryFailedError: relation does not exist`

**Solution:**

```bash
# Drop and recreate schema (WARNING: This will delete all data)
npm run schema:drop
npm run start:dev
```

#### Seed Data Errors

**Error:** Errors during `npm run seed:dev`

**Solution:**

- Ensure database is empty or drop existing data
- Check database connection settings
- Verify you have enough memory (the seed script uses `--max-old-space-size=1024`)

---

# Part B: Cloud Deployment

This section covers deploying the Bus Ticket Booking System to cloud hosting services. We'll use:

- **NeonDB** for PostgreSQL database hosting
- **Render** for backend API hosting
- **Vercel** for frontend hosting

---

## Cloud Prerequisites

Before starting cloud deployment, ensure you have:

1. **GitHub Account** - For code repository and deployments
2. **NeonDB Account** - Sign up at [neon.tech](https://neon.tech/)
3. **Render Account** - Sign up at [render.com](https://render.com/)
4. **Vercel Account** - Sign up at [vercel.com](https://vercel.com/)
5. **Code Repository** - Your code pushed to GitHub

**Required Third-Party Services:**

- **SendGrid Account** - For email notifications ([sendgrid.com](https://sendgrid.com/))
- **Cloudinary Account** - For image uploads ([cloudinary.com](https://cloudinary.com/))
- **PayOS Account** - For payment processing ([payos.vn](https://payos.vn/))
- **Google Cloud Console** (Optional) - For OAuth and AI features ([console.cloud.google.com](https://console.cloud.google.com/))

---

## Section 4: Database Setup (NeonDB)

### Step 4.1: Create NeonDB Account and Project

1. Go to [neon.tech](https://neon.tech/) and sign up/login
2. Click **"Create a project"**
3. Configure your project:
   - **Project Name:** `bus-ticket-system` (or your preferred name)
   - **Region:** Choose the closest region to your users (e.g., AWS US East, EU West, Asia Pacific)
   - **PostgreSQL Version:** 16 (recommended) or 15
4. Click **"Create project"**

### Step 4.2: Get Database Connection String

1. After project creation, you'll see the **Connection Details** page
2. Copy the connection string - it will look like:
   ```
   postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
3. **Important:** Save this connection string securely - you'll need it for backend deployment

### Step 4.3: Parse Connection Details

From your connection string, extract these values:

```
postgresql://[USERNAME]:[PASSWORD]@[HOST]/[DATABASE]?sslmode=require
```

Example:

```
postgresql://neondb_owner:AbCdEf123456@ep-cool-cloud-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

Extract:

- **DB_HOST:** `ep-cool-cloud-123456.us-east-2.aws.neon.tech`
- **DB_PORT:** `5432` (default PostgreSQL port)
- **DB_USERNAME:** `neondb_owner`
- **DB_PASSWORD:** `AbCdEf123456`
- **DB_NAME:** `neondb`

### Step 4.4: Configure Database Settings (Optional)

1. In NeonDB dashboard, go to **Settings**
2. Configure:
   - **Auto-suspend:** Set to 5 minutes for free tier (database sleeps when inactive)
   - **Compute size:** Keep default for free tier
   - **Pooling:** Enable connection pooling (recommended)

### Step 4.5: Test Database Connection (Optional)

You can test the connection using `psql` or any PostgreSQL client:

```bash
# Using psql
psql "postgresql://username:password@host/database?sslmode=require"

# Or using the full connection string
psql "your_full_connection_string_here"
```

**Note:** NeonDB requires SSL connections, so always include `?sslmode=require` in your connection string.

---

## Section 5: Backend Deployment (Render)

### Step 5.1: Prepare Your Repository

1. Ensure your backend code is pushed to GitHub
2. Make sure you have a `.gitignore` file that excludes:
   ```
   node_modules/
   .env
   dist/
   ```

### Step 5.2: Create Render Web Service

1. Go to [render.com](https://render.com/) and login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect account"** if first time
   - Select your repository
   - Choose the **backend** directory if it's in a monorepo

### Step 5.3: Configure Web Service

Fill in the following settings:

**Basic Settings:**

- **Name:** `bus-ticket-backend` (or your preferred name)
- **Region:** Choose the same region as your NeonDB (for lower latency)
- **Branch:** `main` (or your production branch)
- **Root Directory:** Leave empty if backend is at root, or specify path (e.g., `Bus-Ticket-Backend`)
- **Runtime:** `Node`
- **Build Command:**
  ```bash
  npm install && npm run build
  ```
- **Start Command:**
  ```bash
  npm run start:prod
  ```

**Instance Type:**

- **Free tier** for testing
- **Starter ($7/month)** or higher for production

### Step 5.4: Configure Environment Variables

In the **Environment Variables** section, add all the following variables:

Click **"Add Environment Variable"** and add each one:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DB_HOST=your-neondb-host.region.aws.neon.tech
DB_PORT=5432
DB_USERNAME=your_neondb_username
DB_PASSWORD=your_neondb_password
DB_NAME=neondb

# Database Connection Pool (Optimized for Render)
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
DB_REAP_INTERVAL=1000
DB_MAX_USES=7500

# ============================================
# APPLICATION CONFIGURATION
# ============================================
NODE_ENV=production
PORT=3000

# ============================================
# FRONTEND URL (Update after Vercel deployment)
# ============================================
FRONTEND_URL=https://your-app.vercel.app

# ============================================
# GOOGLE OAUTH (Optional)
# ============================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/auth/google/callback

# ============================================
# GOOGLE MAPS & GEMINI AI (Optional)
# ============================================
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-1.5-flash

# ============================================
# FACEBOOK OAUTH (Optional)
# ============================================
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_CALLBACK_URL=https://your-backend.onrender.com/auth/facebook/callback

# ============================================
# EMAIL CONFIGURATION (Required)
# ============================================
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=your_verified_sender@example.com

# ============================================
# PAYMENT GATEWAY - PAYOS (Required)
# ============================================
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
PAYOS_RETURN_URL=https://your-app.vercel.app/payment/success
PAYOS_CANCEL_URL=https://your-app.vercel.app/payment/cancel

# Set to false for production payments
FORCE_TEST_PAYMENT=false

# ============================================
# CLOUDINARY (Required)
# ============================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ============================================
# BUILD CONFIGURATION
# ============================================
NPM_CONFIG_PRODUCTION=false
```

**Important Notes:**

- Replace all placeholder values with your actual credentials
- The `FRONTEND_URL` should be updated after you deploy the frontend to Vercel
- OAuth callback URLs must match your Render backend URL
- PayOS return/cancel URLs should point to your Vercel frontend

### Step 5.5: Deploy Backend

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build your application
   - Start the server
3. Monitor the deployment logs for any errors
4. First deployment may take 5-10 minutes

### Step 5.6: Verify Backend Deployment

1. Once deployed, Render will provide a URL like: `https://bus-ticket-backend.onrender.com`
2. Visit your backend URL:
   - **API Docs:** `https://your-backend.onrender.com/api`
   - **Health Check:** `https://your-backend.onrender.com/`
3. You should see the Swagger documentation

### Step 5.7: Run Database Migrations (If Needed)

If you're using migrations instead of auto-sync:

1. In Render dashboard, go to your service
2. Click **"Shell"** tab
3. Run migration commands:
   ```bash
   npm run migration:run
   ```

### Step 5.8: Seed Database (Optional)

To populate your production database with initial data:

1. In Render dashboard, go to **"Shell"**
2. Run seed command:
   ```bash
   npm run seed:prod
   ```

**Warning:** Only do this on a fresh database to avoid duplicate data.

### Step 5.9: Configure Auto-Deploy

1. In your service settings, enable **"Auto-Deploy"**
2. Now, every push to your main branch will trigger automatic deployment
3. You can also manually deploy from the Render dashboard

---

## Section 6: Frontend Deployment (Vercel)

### Step 6.1: Prepare Frontend Repository

1. Ensure your frontend code is pushed to GitHub
2. Verify `.gitignore` excludes:
   ```
   node_modules/
   .next/
   .env
   .env.local
   ```

### Step 6.2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com/) and login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository:
   - Click **"Import"** next to your repository
   - If in a monorepo, select the frontend directory

### Step 6.3: Configure Project Settings

**Framework Preset:**

- Vercel should auto-detect **Next.js**

**Root Directory:**

- If frontend is in a subdirectory, specify it (e.g., `Bus-Ticket-Frontend`)
- Otherwise, leave as `./`

**Build Settings:**

- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### Step 6.4: Configure Environment Variables

Click **"Environment Variables"** and add:

```env
# ============================================
# BACKEND API CONFIGURATION
# ============================================
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com

# ============================================
# OPTIONAL: ANALYTICS
# ============================================
# Vercel Analytics is automatically enabled for Vercel deployments
# No additional configuration needed
```

**Important:**

- Replace `https://your-backend.onrender.com` with your actual Render backend URL
- The `NEXT_PUBLIC_` prefix is required for client-side environment variables
- Add these variables for all environments (Production, Preview, Development)

### Step 6.5: Deploy Frontend

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Build your Next.js application
   - Deploy to their CDN
3. First deployment takes 2-5 minutes
4. Monitor the build logs for any errors

### Step 6.6: Get Your Frontend URL

1. After successful deployment, Vercel provides:
   - **Production URL:** `https://your-app.vercel.app`
   - **Custom domain option:** You can add your own domain later
2. Copy this URL - you'll need it for the next step

### Step 6.7: Update Backend Environment Variables

Now that you have your frontend URL, update your backend on Render:

1. Go to Render dashboard → Your backend service
2. Go to **"Environment"** tab
3. Update these variables:
   ```env
   FRONTEND_URL=https://your-app.vercel.app
   PAYOS_RETURN_URL=https://your-app.vercel.app/payment/success
   PAYOS_CANCEL_URL=https://your-app.vercel.app/payment/cancel
   ```
4. Click **"Save Changes"**
5. Render will automatically redeploy your backend

### Step 6.8: Update OAuth Callback URLs

If using Google or Facebook OAuth, update the callback URLs in their respective consoles:

**Google Cloud Console:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs:**
   ```
   https://your-backend.onrender.com/auth/google/callback
   ```
5. Add to **Authorized JavaScript origins:**
   ```
   https://your-app.vercel.app
   https://your-backend.onrender.com
   ```

**Facebook Developers:**

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Select your app → **Settings** → **Basic**
3. Add **App Domains:** `vercel.app` and `onrender.com`
4. Update **Valid OAuth Redirect URIs:**
   ```
   https://your-backend.onrender.com/auth/facebook/callback
   ```

### Step 6.9: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your custom domain
4. Follow Vercel's instructions to configure DNS
5. Vercel automatically provisions SSL certificates

### Step 6.10: Enable Auto-Deploy

Vercel automatically enables auto-deploy:

- **Production:** Deploys from `main` branch
- **Preview:** Creates preview deployments for pull requests
- Every push triggers a new deployment

---

## Cloud Verification

### Complete Cloud System Check

#### 1. Database Verification

**Check NeonDB Dashboard:**

- Go to NeonDB dashboard
- Verify database is active
- Check **Tables** tab to see if schema was created
- Monitor **Monitoring** tab for connection activity

**Test Database Connection:**

```bash
# From your local machine
psql "your_neondb_connection_string"

# List tables
\dt

# Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

#### 2. Backend API Verification

**Test API Endpoints:**

1. **Health Check:**

   ```bash
   curl https://your-backend.onrender.com/
   ```

2. **API Documentation:**
   - Visit: `https://your-backend.onrender.com/api`
   - You should see Swagger UI

3. **Test a Public Endpoint:**

   ```bash
   curl https://your-backend.onrender.com/trips
   ```

4. **Check Logs:**
   - Go to Render dashboard → Your service → **Logs**
   - Look for successful startup messages
   - Check for any errors

#### 3. Frontend Verification

**Test Frontend Application:**

1. **Homepage:**
   - Visit: `https://your-app.vercel.app`
   - Verify the page loads correctly
   - Check browser console for errors

2. **API Integration:**
   - Try searching for trips
   - Check if data loads from backend
   - Monitor Network tab in browser DevTools

3. **Authentication:**
   - Try registering a new user
   - Test login functionality
   - Verify cookies are set correctly

4. **Check Vercel Logs:**
   - Go to Vercel dashboard → Your project → **Deployments**
   - Click on latest deployment → **View Function Logs**
   - Check for any runtime errors

#### 4. End-to-End Flow Test

Test the complete user journey:

1. ✅ Register a new account
2. ✅ Login with credentials
3. ✅ Search for trips
4. ✅ Select seats
5. ✅ Create booking
6. ✅ Process payment (test mode)
7. ✅ Receive confirmation email
8. ✅ View booking details

#### 5. Performance Check

**Backend Performance:**

- First request may be slow (cold start on free tier)
- Subsequent requests should be faster
- Monitor response times in Render logs

**Frontend Performance:**

- Run Lighthouse audit in Chrome DevTools
- Check Core Web Vitals
- Verify images are optimized

**Database Performance:**

- Monitor query performance in NeonDB dashboard
- Check connection pool usage
- Verify indexes are created

---

## Cloud Troubleshooting

### Common Cloud Deployment Issues

#### NeonDB Issues

**Issue:** Database connection timeout

**Solution:**

- Verify connection string is correct
- Ensure `?sslmode=require` is in connection string
- Check if NeonDB project is active (not suspended)
- Verify IP allowlist settings (NeonDB allows all by default)

**Issue:** Database auto-suspends frequently

**Solution:**

- This is normal for free tier
- First request after suspension will be slower
- Upgrade to paid plan for always-on database
- Or implement connection retry logic in backend

#### Render Deployment Issues

**Issue:** Build fails with "Module not found"

**Solution:**

```bash
# Ensure all dependencies are in package.json, not just devDependencies
# Check that NPM_CONFIG_PRODUCTION=false is set
```

**Issue:** Application crashes on startup

**Solution:**

- Check Render logs for error messages
- Verify all environment variables are set
- Ensure `start:prod` script exists in package.json
- Check that `dist/src/main.js` exists after build

**Issue:** "Port already in use" error

**Solution:**

- Don't hardcode port in your application
- Use `process.env.PORT` (Render sets this automatically)
- In your `main.ts`:
  ```typescript
  const port = process.env.PORT || 3000;
  await app.listen(port);
  ```

**Issue:** Database migrations not running

**Solution:**

```bash
# Run migrations manually via Render Shell
npm run migration:run

# Or add to build command
npm install && npm run build && npm run migration:run
```

**Issue:** Slow cold starts (free tier)

**Solution:**

- Free tier services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Upgrade to paid plan for always-on service
- Or use a service like [UptimeRobot](https://uptimerobot.com/) to ping your API every 10 minutes

#### Vercel Deployment Issues

**Issue:** Build fails with "Module not found"

**Solution:**

- Verify all dependencies are in `package.json`
- Check import paths are correct (case-sensitive)
- Clear Vercel cache and redeploy

**Issue:** Environment variables not working

**Solution:**

- Ensure variables have `NEXT_PUBLIC_` prefix for client-side access
- Redeploy after adding environment variables
- Check variables are set for correct environment (Production/Preview/Development)

**Issue:** API calls fail with CORS error

**Solution:**

- Verify `FRONTEND_URL` is set correctly in Render backend
- Check backend CORS configuration allows Vercel domain
- Ensure `withCredentials: true` is set in API client

**Issue:** 404 on page refresh

**Solution:**

- This shouldn't happen with Next.js on Vercel
- If using custom server, ensure proper routing
- Check `next.config.ts` for any routing issues

#### Integration Issues

**Issue:** Frontend can't connect to backend

**Solution:**

- Verify `NEXT_PUBLIC_API_BASE_URL` in Vercel matches Render backend URL
- Check backend is running (visit `/api` endpoint)
- Verify CORS settings in backend
- Check browser console for specific errors

**Issue:** Authentication not working

**Solution:**

- Verify cookies are being set (check browser DevTools → Application → Cookies)
- Ensure `withCredentials: true` in frontend API config
- Check `FRONTEND_URL` in backend matches Vercel URL exactly
- Verify OAuth callback URLs are updated

**Issue:** Payment webhook not working

**Solution:**

- Verify PayOS webhook URL is set to your Render backend
- Check webhook endpoint is accessible publicly
- Monitor Render logs for incoming webhook requests
- Verify webhook signature validation

**Issue:** Email notifications not sending

**Solution:**

- Verify SendGrid API key is correct
- Check sender email is verified in SendGrid
- Monitor SendGrid dashboard for delivery status
- Check Render logs for email sending errors

#### Performance Issues

**Issue:** Slow API responses

**Solution:**

- Check database query performance in NeonDB dashboard
- Add database indexes for frequently queried fields
- Optimize N+1 queries
- Enable database connection pooling
- Consider upgrading Render instance

**Issue:** High memory usage

**Solution:**

- Monitor memory usage in Render dashboard
- Optimize database queries to reduce memory footprint
- Adjust `--max-old-space-size` in start command if needed
- Consider upgrading instance type

**Issue:** Database connection pool exhausted

**Solution:**

- Reduce `DB_POOL_MAX` to match your instance capabilities
- Ensure connections are properly closed
- Monitor active connections in NeonDB dashboard
- Implement connection retry logic

---

## Additional Resources

### Useful Commands

**Backend:**

```bash
# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Format code
npm run format

# Lint code
npm run lint

# Generate migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run
```

**Frontend:**

```bash
# Build for production
npm run build

# Start production server
npm run start

# Format code
npm run format

# Lint code
npm run lint
```

### Documentation

**Project Documentation:**

- **Backend Authentication:** See `docs/authentication.md` in the backend repository
- **API Documentation (Local):** http://localhost:3000/api
- **API Documentation (Cloud):** https://your-backend.onrender.com/api
- **Frontend Design System:** See `design/design-system.md` in the frontend repository

**Deployment Documentation:**

- **Local Deployment:** See Part A of this document
- **Cloud Deployment:** See Part B of this document
- **Backend README:** See `README.md` in the backend repository
- **Frontend README:** See `README.md` in the frontend repository

**Service Documentation:**

- **NeonDB:** [Database Management Guide](https://neon.tech/docs/introduction)
- **Render:** [Web Service Deployment Guide](https://render.com/docs/web-services)
- **Vercel:** [Next.js Deployment Guide](https://vercel.com/docs/frameworks/nextjs)

---

## Next Steps

### After Local Deployment:

1. **Create an Admin Account:**
   - Register a user through the frontend
   - Manually update the user's role to `ADMIN` in the database:
     ```sql
     UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
     ```

2. **Configure Payment Gateway:**
   - Sign up for PayOS account at [payos.vn](https://payos.vn/)
   - Add real credentials to `.env`
   - Set `FORCE_TEST_PAYMENT=false` for production

3. **Configure Email Service:**
   - Verify your sender email in SendGrid
   - Test email notifications by registering a new user

4. **Add Sample Data:**
   - Use the seed scripts to populate routes and operators
   - Or manually add data through the admin panel

### After Cloud Deployment:

1. **Monitor Application Health:**
   - **NeonDB:** Check database metrics and query performance
   - **Render:** Monitor logs, response times, and error rates
   - **Vercel:** Review deployment logs and analytics

2. **Set Up Custom Domain (Optional):**
   - Configure custom domain in Vercel
   - Update `FRONTEND_URL` in Render backend
   - Update OAuth callback URLs in Google/Facebook consoles

3. **Configure Production Services:**
   - **SendGrid:** Verify sender domain (not just email) for better deliverability
   - **Cloudinary:** Set up upload presets and transformations
   - **PayOS:** Configure webhook URL in PayOS dashboard
   - **Google Cloud:** Enable required APIs (Maps, Gemini)

4. **Security Hardening:**
   - Review and rotate all API keys and secrets
   - Enable 2FA on all service accounts
   - Set up monitoring and alerts for suspicious activity
   - Configure rate limiting in backend
   - Review CORS settings

5. **Performance Optimization:**
   - Add database indexes for frequently queried fields
   - Enable CDN caching for static assets
   - Optimize images and assets
   - Monitor and optimize slow queries

6. **Backup Strategy:**
   - **NeonDB:** Enable automated backups (available in paid plans)
   - **Render:** Set up database backup scripts
   - Document recovery procedures

7. **Monitoring and Alerts:**
   - Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
   - Configure error tracking (e.g., Sentry)
   - Set up log aggregation
   - Create alerts for critical errors

8. **Documentation:**
   - Document your production URLs
   - Keep a secure record of all credentials
   - Document deployment procedures
   - Create runbooks for common issues

9. **Testing:**
   - Run end-to-end tests on production
   - Test payment flow with real transactions
   - Verify email delivery
   - Test OAuth flows
   - Load test critical endpoints

10. **Compliance and Legal:**
    - Add privacy policy and terms of service
    - Ensure GDPR compliance if serving EU users
    - Configure cookie consent
    - Set up data retention policies

---

## Support

### For Local Deployment Issues:

- Check the `docs/` folder in both repositories
- Review the README.md files
- Verify all prerequisites are installed
- Check database connection settings
- Review environment variables

### For Cloud Deployment Issues:

**NeonDB Support:**

- [NeonDB Documentation](https://neon.tech/docs)
- [NeonDB Community Discord](https://discord.gg/neon)
- [NeonDB Status Page](https://neonstatus.com/)

**Render Support:**

- [Render Documentation](https://render.com/docs)
- [Render Community Forum](https://community.render.com/)
- [Render Status Page](https://status.render.com/)

**Vercel Support:**

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community Discussions](https://github.com/vercel/vercel/discussions)
- [Vercel Status Page](https://www.vercel-status.com/)

### Third-Party Service Support:

- **SendGrid:** [Documentation](https://docs.sendgrid.com/) | [Support](https://support.sendgrid.com/)
- **Cloudinary:** [Documentation](https://cloudinary.com/documentation) | [Support](https://support.cloudinary.com/)
- **PayOS:** [Documentation](https://payos.vn/docs) | [Support](https://payos.vn/support)
- **Google Cloud:** [Documentation](https://cloud.google.com/docs) | [Support](https://cloud.google.com/support)

### General Support:

- Check existing GitHub issues in your repository
- Review deployment logs for specific error messages
- Contact the development team
- Consult the troubleshooting sections in this guide

---

**Last Updated:** January 2, 2026  
**Version:** 0.3.0  
**Document Type:** Deployment Guide (Local & Cloud)
