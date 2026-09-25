# Deployment Error Fix

## ❌ The Error You Encountered

```
✘ [ERROR] Could not detect a directory containing static files (e.g. html, css and js) for the project
```

## 🔍 What Went Wrong

You tried to use `npx wrangler deploy` as the **build command** on Cloudflare Pages. This is incorrect because:

1. **Cloudflare Pages** has its own build system that expects:
   - A build command (like `npm run build`)
   - An output directory with static files (like `dist/`)

2. **Wrangler** is for deploying **Cloudflare Workers**, not Pages

3. These are **two separate services** that must be deployed independently

## ✅ The Correct Approach

### You Need TWO Deployments:

#### 1. Deploy the Worker (Backend API)
```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

This deploys your backend to: `https://streamfetch-worker.YOUR_SUBDOMAIN.workers.dev`

#### 2. Deploy the Frontend (Cloudflare Pages)

In the Cloudflare Pages dashboard:
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variable**: 
  - Name: `VITE_WORKER_URL`
  - Value: `https://streamfetch-worker.YOUR_SUBDOMAIN.workers.dev/api`

**Do NOT set the build command to `npx wrangler deploy`**

## 📖 Complete Instructions

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step deployment instructions.

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│   Cloudflare Pages (Frontend)       │
│   - React/Vite/Tailwind             │
│   - Build: npm run build            │
│   - Output: dist/                   │
└──────────────┬──────────────────────┘
               │
               │ POST /api/extract
               │
┌──────────────▼──────────────────────┐
│   Cloudflare Worker (Backend)       │
│   - JavaScript                      │
│   - Deploy: wrangler deploy         │
│   - URL: streamfetch-worker.xxx...  │
└─────────────────────────────────────┘
```

## 🎯 Quick Fix Steps

1. **Deploy the Worker first:**
   ```bash
   cd worker
   npx wrangler login
   npx wrangler deploy
   ```
   Copy the Worker URL from the output.

2. **Go to Cloudflare Pages dashboard**

3. **Create/Edit your Pages project:**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add environment variable: `VITE_WORKER_URL` = your Worker URL

4. **Deploy**

That's it! The frontend will now correctly call your Worker API.
