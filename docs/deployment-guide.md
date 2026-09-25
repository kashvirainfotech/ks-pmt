# KS-PMT Enterprise Production Deployment Guide

This guide provides end-to-end instructions for deploying the **KS-PMT** (Kashvira Infotech - Project & Product Management Tool) ecosystem across cloud infrastructure, databases, web applications, and mobile platforms.

---

## 1. System Architecture Overview

```
                                +---------------------------+
                                |      End Users & Apps     |
                                +-------------+-------------+
                                              |
                     +------------------------+------------------------+
                     |                                                 |
         [Modern Web Application]                             [Mobile Application]
         (React 18 + Vite + Tailwind)                         (Flutter Android & iOS)
                     |                                                 |
                     +------------------------+------------------------+
                                              | HTTPS (REST API)
                                              v
                              +-------------------------------+
                              |    Nginx Reverse Proxy / SSL  |
                              +---------------+---------------+
                                              |
                                              v
                              +-------------------------------+
                              |     NestJS Backend API        |
                              |    (Modular REST Server)      |
                              +---+---------------+-------+---+
                                  |               |       |
                 +----------------+               |       +----------------+
                 |                                |                        |
                 v                                v                        v
     +-----------------------+        +-----------------------+   +-------------------+
     | PostgreSQL 15+ (DB)   |        | AWS S3 Cloud Storage  |   | Firebase Cloud    |
     | - Multi-branch RBAC   |        | - Pre-signed PUT/GET  |   | Messaging (FCM)   |
     | - Audit Trail Log     |        | - Zero server storage |   | - Push Alerts     |
     | - Workflows & Tasks   |        | - Encrypted at rest   |   +-------------------+
     +-----------------------+        +-----------------------+
```

---

## 2. PostgreSQL Database Setup & Execution Order

> [!IMPORTANT]
> In accordance with KS-PMT database rules, **AI agents never execute database migrations directly**. The human developer / DBA must review and execute scripts manually in the target database.

### 2.1 Database Creation
```bash
# Connect to PostgreSQL host
psql -U postgres

# Create database and extensions
CREATE DATABASE kspmt_prod WITH ENCODING 'UTF8';
\c kspmt_prod;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 2.2 Ordered Execution of Static SQL Scripts
Run the scripts in strict sequential order from the project root:

```bash
# Step 1: Base Tables (Audit columns & masters)
psql -U postgres -d kspmt_prod -f dbscripts/tables/tables.sql

# Step 2: Cumulative Alter Statements (if any)
psql -U postgres -d kspmt_prod -f dbscripts/tables/alter_tables.sql

# Step 3: Stored Functions
psql -U postgres -d kspmt_prod -f dbscripts/functions/fn_set_updated_at.sql
psql -U postgres -d kspmt_prod -f dbscripts/functions/fn_calculate_task_effort.sql
psql -U postgres -d kspmt_prod -f dbscripts/functions/fn_log_task_audit.sql

# Step 4: Triggers
psql -U postgres -d kspmt_prod -f dbscripts/triggers/trg_users_updated_at.sql
psql -U postgres -d kspmt_prod -f dbscripts/triggers/trg_projects_updated_at.sql
psql -U postgres -d kspmt_prod -f dbscripts/triggers/trg_tasks_updated_at.sql
psql -U postgres -d kspmt_prod -f dbscripts/triggers/trg_tasks_audit.sql

# Step 5: Analytical Views
psql -U postgres -d kspmt_prod -f dbscripts/views/vw_project_financial_summary.sql
psql -U postgres -d kspmt_prod -f dbscripts/views/vw_product_license_summary.sql
psql -U postgres -d kspmt_prod -f dbscripts/views/vw_employee_workload.sql
psql -U postgres -d kspmt_prod -f dbscripts/views/vw_task_hierarchy.sql

# Step 6: Optimized Composite Indexes
psql -U postgres -d kspmt_prod -f dbscripts/indexes/indexes.sql

# Step 7: System Seed Data & Super Admin
psql -U postgres -d kspmt_prod -f dbscripts/inserts/inserts.sql
```

---

## 3. AWS S3 Bucket Setup (Direct Pre-Signed Uploads)

### 3.1 Create Private S3 Bucket
1. Log into AWS Console -> **S3** -> **Create bucket**.
2. **Bucket name**: `kspmt-enterprise-attachments-prod`.
3. **Block all public access**: **Enabled** (all downloads must use pre-signed URLs).
4. **Default encryption**: SSE-S3 or AWS-KMS.

### 3.2 S3 CORS Configuration
Paste the following CORS policy into bucket settings to enable direct browser uploads:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": [
      "https://pmt.kashvirainfotech.com",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3.3 IAM Policy (Least Privilege for NestJS Server)
Create an IAM user `kspmt-api-service` and attach the policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::kspmt-enterprise-attachments-prod/*"
    }
  ]
}
```

---

## 4. Backend REST API Deployment (`server/`)

### 4.1 Production Environment Configuration (`.env.production`)
```env
NODE_ENV=production
PORT=4000

# Database Connection Pool
DATABASE_HOST=postgres-prod.internal
DATABASE_PORT=5432
DATABASE_USER=kspmt_app
DATABASE_PASSWORD=SuperSecurePassword123!
DATABASE_NAME=kspmt_prod
DATABASE_MAX_POOL=30
DATABASE_SSL=false

# JWT Authentication
JWT_ACCESS_SECRET=your-256-bit-access-secret-key-here-minimum-32-chars
JWT_ACCESS_EXPIRATION=900s
JWT_REFRESH_SECRET=your-256-bit-refresh-secret-key-here-minimum-32-chars
JWT_REFRESH_EXPIRATION=7d

# AWS S3 Integration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
AWS_S3_BUCKET_NAME=kspmt-enterprise-attachments-prod

# CORS Settings
CORS_ORIGIN=https://pmt.kashvirainfotech.com
```

### 4.2 Build & Process Management (PM2)
```bash
cd server
npm ci --production=false
npm run build

# Start with PM2 cluster mode
pm2 start dist/main.js --name "kspmt-api" -i max --env production
pm2 save
pm2 startup
```

---

## 5. Web Application Deployment (`web/`)

### 5.1 Production Build
```bash
cd web
npm ci
npm run build
# Generates production artifacts in web/dist/
```

### 5.2 Nginx Server Block Configuration
```nginx
server {
    listen 80;
    server_name pmt.kashvirainfotech.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pmt.kashvirainfotech.com;

    ssl_certificate /etc/letsencrypt/live/pmt.kashvirainfotech.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pmt.kashvirainfotech.com/privkey.pem;

    root /var/www/kspmt-web/dist;
    index index.html;

    # Static Assets Cache
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse Proxy to NestJS Backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Mobile Application Release (`mobile/`)

### 6.1 Android Release Build (Google Play)
1. **Keystore Generation**:
   ```bash
   keytool -genkey -v -keystore android/app/kspmt-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias kspmt
   ```
2. **Key Properties (`android/key.properties`)**:
   ```properties
   storePassword=YourStorePassword
   keyPassword=YourKeyPassword
   keyAlias=kspmt
   storeFile=kspmt-release-key.jks
   ```
3. **Build Android App Bundle (AAB)**:
   ```bash
   cd mobile
   flutter build appbundle --release
   # Output: build/app/outputs/bundle/release/app-release.aab
   ```

### 6.2 iOS Release Build (Apple App Store & TestFlight)
1. Configure App ID and Push Notification capabilities in **Apple Developer Portal**.
2. Open `mobile/ios/Runner.xcworkspace` in Xcode.
3. Select your Development Team and set Bundle Identifier (`com.kashvirainfotech.kspmt`).
4. Build and archive:
   ```bash
   cd mobile
   flutter build ipa --release
   ```
5. Upload to TestFlight via Xcode Organizer.

---

## 7. Security & Maintenance Checklist

| Category | Recommended Verification |
| :--- | :--- |
| **Authentication** | Default Super Admin password must be changed immediately upon first login. |
| **Backups** | Automated daily `pg_dump` snapshot backed up to cold storage with 30-day retention. |
| **Audit Logs** | `audit_logs` table should be partitioned quarterly for high-volume enterprise environments. |
| **Rate Limiting** | OTP generation limited to 1 request per minute per phone number to prevent SMS abuse. |
| **S3 Hygiene** | Bucket lifecycle rules configured to purge incomplete multipart uploads after 7 days. |
