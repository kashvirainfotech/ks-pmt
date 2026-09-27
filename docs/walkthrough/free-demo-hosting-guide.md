# Free Hosting & Demo Deployment Guide for KS-PMT

This document outlines the recommended **100% free hosting providers and configurations** to deploy a live demo of the **KS-PMT** ecosystem (Backend REST API, Web Frontend, and PostgreSQL Database).

---

## 1. Project Component Compatibility Analysis

Based on the KS-PMT architecture and codebase:

| Component | Technical Requirements | Free Hosting Fit |
| :--- | :--- | :--- |
| **PostgreSQL Database** | PostgreSQL 15+, `pgcrypto`, `uuid-ossp`, raw SQL DDL execution | **Neon.tech** or **Supabase** |
| **Backend REST API** | Node.js 20+ / NestJS runtime, persistent connection pool (`pg.Pool`), `DB_SSL=true` | **Render.com** (Web Service) or **Koyeb** |
| **Web Frontend** | React 18 + Vite SPA, client-side routing, static build (`web/dist/`) | **Vercel**, **Cloudflare Pages**, or **Netlify** |

---

## 2. Recommended Free Hosting Stack

### Stack Choice: **Neon + Render + Vercel** (Best Free Combination)

- **Database**: [Neon.tech](https://neon.tech/) (Free Serverless PostgreSQL 16)
  - 0.5 GB storage (plenty for demo datasets).
  - Built-in SQL Editor in the browser (easy to execute `dbscripts/install.sql`).
  - Native SSL support (`DB_SSL=true`).
- **Backend API**: [Render.com](https://render.com/) (Free Web Service)
  - Free tier supports Node.js web services.
  - Automatically builds from your GitHub repository `server/` directory.
  - Note: Free instances spin down after 15 minutes of inactivity (cold start ~30-50s on initial request).
- **Web Frontend**: [Vercel](https://vercel.com/) (Free Hobby Tier)
  - Blazing fast static edge hosting for Vite React SPAs.
  - Automatic SSL, continuous Git deployments, and SPA route rewrites.

---

## 3. Alternative All-In-One or Low-Latency Options

| Provider / Combination | Database | Backend API | Web Frontend | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Option A (Neon + Render + Vercel)** *(Recommended)* | Neon Free | Render Free Web Service | Vercel Free | Zero cost, reliable, separate concerns, no credit card required. |
| **Option B (Supabase + Koyeb + Cloudflare)** | Supabase Free | Koyeb Free "Nano" | Cloudflare Pages | Supabase provides easy GUI table management. Koyeb has faster wake-up times than Render. |
| **Option C (All-on-Render)** | Render PostgreSQL | Render Web Service | Render Static Site | Single dashboard, but Render's free PostgreSQL expires after 30 days unless upgraded. |

---

## 4. Step-by-Step Deployment Guide

### Step 1: Provision Free PostgreSQL Database (Neon or Supabase)

1. Sign up at [Neon.tech](https://neon.tech) (or [Supabase](https://supabase.com)).
2. Create a new project (e.g. `kspmt-demo`) and select the region closest to you.
3. Note your connection credentials:
   - **Host** (e.g., `ep-xyz.us-east-2.aws.neon.tech`)
   - **Database Name** (e.g., `neondb` or `kspmt_db`)
   - **User** & **Password**
   - **Port** (`5432`)
4. Open the **SQL Editor** in Neon/Supabase.
5. In your local terminal, generate the unified install script:
   ```bash
   node dbscripts/build-install.mjs
   ```
6. Open `dbscripts/install.sql`, copy all contents, paste into the Neon/Supabase SQL Editor, and click **Run**.
7. Confirm that all tables, views, triggers, functions, and seed data (including the default Super Admin) are created.

---

### Step 2: Deploy Backend REST API (Render.com)

1. Sign up at [Render.com](https://render.com) and link your GitHub repository.
2. Click **New +** -> **Web Service**.
3. Configure the service:
   - **Name**: `ks-pmt-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod` (or `node dist/main.js`)
   - **Instance Type**: `Free`
4. Add the following **Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=10000
   API_PREFIX=/api/v1
   CORS_ORIGINS=https://your-frontend-domain.vercel.app,http://localhost:3000

   # Database Connection (from Neon/Supabase)
   DB_HOST=ep-xyz.us-east-2.aws.neon.tech
   DB_PORT=5432
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   DB_SSL=true
   DB_POOL_MAX=10

   # JWT Secrets (generate 32+ character random strings)
   JWT_ACCESS_SECRET=your_long_random_access_secret_key_minimum_32_characters
   JWT_ACCESS_EXPIRATION=15m
   JWT_REFRESH_SECRET=your_long_random_refresh_secret_key_minimum_32_characters
   JWT_REFRESH_EXPIRATION=7d

   # Demo Mode Flags
   OTP_MOCK_DISPATCH=true
   ```
5. Click **Create Web Service**. Once deployed, copy your API URL (e.g., `https://ks-pmt-api.onrender.com`).

---

### Step 3: Deploy Web Frontend (Vercel)

1. Sign up at [Vercel](https://vercel.com) and import your Git repository.
2. In Project Configuration:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   ```env
   VITE_API_URL=https://ks-pmt-api.onrender.com/api/v1
   ```
4. For client-side routing (prevent 404 on page reload), ensure `web/vercel.json` exists with:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
5. Click **Deploy**. Vercel will assign a URL like `https://ks-pmt.vercel.app`.
6. Update the `CORS_ORIGINS` on Render to include your newly created Vercel URL.

---

### Step 4: Login to Demo Application

- Open your Vercel URL (`https://ks-pmt.vercel.app`).
- Log in with the default seeded Super Admin credentials:
  - **Email**: `admin@kashvirainfotech.com`
  - **Password**: `Admin@123456`
  - **OTP (if using mobile login)**: `123456` (or check Render server logs)
