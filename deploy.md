
# 🚀 Deployment Guide: Spot Capacity Advisor (Vite Edition)

This document outlines the procedures for containerizing and deploying the application using **Vite**.

## 📋 Table of Contents
1.  [Project Structure](#-project-structure)
2.  [Configuration Files](#-configuration-files)
3.  [Docker Setup](#-docker-setup)
4.  [Deployment Commands](#-deployment-commands)
5.  [Troubleshooting](#-troubleshooting)

---

## 📂 Project Structure

Ensure your local directory matches the following structure. 
**Note:** The application logic resides in the `src/` directory.

```text
spot-capacity-advisor/
├── src/                  # Source Code
│   ├── components/       # UI Components
│   ├── hooks/            # Custom React Hooks
│   ├── services/         # Business Logic & API Layers
│   ├── App.tsx           # Main Component
│   ├── config.ts         # Static Configuration
│   ├── constants.tsx     # Icons & UI Constants
│   ├── export.ts         # PDF/CSV Export Logic
│   ├── index.tsx         # Entry Point
│   ├── styles.css        # Tailwind Directives
│   ├── types.ts          # TypeScript Interfaces
│   ├── utils.ts          # Shared Utilities
│   └── vite-env.d.ts     # Type Definitions
├── deploy.md             # This Documentation
├── index.html            # Entry HTML
├── metadata.json         # Project Metadata
├── package.json          # Dependencies & Scripts
├── postcss.config.js     # PostCSS Config
├── tailwind.config.js    # Tailwind Config
├── tsconfig.json         # TypeScript Config
├── vite.config.ts        # Vite Build Configuration
├── .dockerignore         # Docker Ignore Rules
├── .gitignore            # Git Ignore Rules
├── Dockerfile            # Container Definition (Create Manually below)
└── nginx.conf            # Web Server Config (Create Manually below)
```

---

## ⚙️ Configuration Files

Create the following files in your **root directory** to containerize the application.

### 1. Dockerfile
Create a file named `Dockerfile` (no extension).

```dockerfile
# Stage 1: Build the Application
# Using Node 20 to satisfy @google/genai SDK requirements
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition
COPY package.json package-lock.json* ./

# Update npm to latest version (optional, suppresses version warnings)
RUN npm install -g npm@latest

# Install dependencies (including devDependencies for build tools like tsc and vite)
RUN npm install

# Copy all source code
COPY . .

# Build Arguments
ARG API_KEY
ENV VITE_API_KEY=$API_KEY

# Build (Output goes to /app/dist based on vite.config.ts)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

### 2. nginx.conf
Create a file named `nginx.conf`. This handles the Single Page Application routing (directing all traffic to `index.html`) and enables compression.

```nginx
server {
    listen 3000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA Routing: Redirect all 404s to index.html so React Router handles them
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache Control for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

### 3. .dockerignore (Optional but Recommended)
Create a `.dockerignore` file to speed up builds by excluding unnecessary files.

```text
node_modules
dist
build
.git
.env
Dockerfile
deploy.md
README.md
TESTING.md
PROJECT_HISTORY.md
cloudbuild.yaml
```

---

## 🐳 Docker Setup (Manual Local Build)

### 1. Build the Image
```bash
docker build \
  --build-arg API_KEY=your_api_key_here \
  -t spot-capacity-advisor:latest .
```

### 2. Run the Container
```bash
docker run -p 3000:3000 spot-capacity-advisor:latest
```

Open `http://localhost:3000` in your browser.

---

## ☁️ Google Cloud Run Deployment

```bash
# 1. Authenticate
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# 2. Build via Cloud Build
# Uses cloudbuild.yaml to correctly pass the build arguments.
# Quotes are recommended for the substitutions flag to prevent shell interpretation issues.
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions="_API_KEY=[YOUR_KEY]" \
  .

# 3. Deploy
gcloud run deploy spot-advisor \
  --image gcr.io/[YOUR_PROJECT_ID]/spot-advisor \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000
```

---

## 🔧 Troubleshooting

### Build Failures (TS2307: Cannot find module)
If you encounter TypeScript errors during the build process inside Docker (e.g., `Cannot find module './hooks/useCapacityLogic'`), ensure your `tsconfig.json` is correctly configured to include the `src` directory.

**Correct `tsconfig.json` configuration:**
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "src/*": ["./src/*"]
    },
    // ... other options
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts", "vite.config.ts"]
}
```
