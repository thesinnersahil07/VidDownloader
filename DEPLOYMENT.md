# StreamFetch Deployment Guide

## ⚠️ IMPORTANT: Two Separate Deployments Required

StreamFetch consists of **two separate components** that must be deployed independently:

1. **Cloudflare Worker** (backend API)
2. **Cloudflare Pages** (frontend)

---

## Step 1: Deploy the Cloudflare Worker

### 1.1 Install Wrangler

```bash
cd worker
npm install
```

### 1.2 Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser window. Authorize Wrangler to access your Cloudflare account.

### 1.3 Test Locally (Optional)

```bash
npx wrangler dev
```

The Worker will run at `http://localhost:8787`

Test it:
```bash
curl -X POST http://localhost:8787/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://harpalgeo.tv/program/Tapish/26573"}'
```

### 1.4 Deploy to Cloudflare

```bash
npx wrangler deploy
```

After deployment, you'll see output like:
```
Published streamfetch-worker
  https://streamfetch-worker.YOUR_SUBDOMAIN.workers.dev
```

**Copy this URL** — you'll need it for the frontend.

---

## Step 2: Deploy the Frontend to Cloudflare Pages

### Option A: Git Integration (Recommended)

1. **Push your code to GitHub/GitLab**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Navigate to: **Workers & Pages** → **Pages**
   - Click: **Create a project**

3. **Connect your repository**
   - Select: **Connect to Git**
   - Choose your GitHub/GitLab repository
   - Select the branch (usually `main`)

4. **Configure build settings**
   - **Framework preset**: Select "Vite" (or "None")
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: Leave empty (or `/` if your repo root)

5. **Add environment variable** (IMPORTANT)
   - Click: **Environment variables**
   - Add:
     - **Variable name**: `VITE_WORKER_URL`
     - **Value**: `https://streamfetch-worker.YOUR_SUBDOMAIN.workers.dev/api`
     - (Replace `YOUR_SUBDOMAIN` with your actual Cloudflare subdomain from Step 1.4)

6. **Deploy**
   - Click: **Save and Deploy**
   - Wait for the build to complete (~1-2 minutes)

### Option B: Direct Upload

If you don't want to use Git integration:

1. **Build the frontend locally**
   ```bash
   npm run build
   ```

2. **Create environment file**
   Create a file named `.env` in the project root:
   ```
   VITE_WORKER_URL=https://streamfetch-worker.YOUR_SUBDOMAIN.workers.dev/api
   ```
   (Replace `YOUR_SUBDOMAIN` with your actual Worker URL from Step 1.4)

3. **Rebuild with the environment variable**
   ```bash
   npm run build
   ```

4. **Upload to Cloudflare Pages**
   - Go to: https://dash.cloudflare.com → Workers & Pages → Pages
   - Click: **Create a project** → **Upload assets**
   - Project name: `streamfetch`
   - Upload the entire `dist` folder
   - Click: **Deploy site**

---

## Step 3: Configure API Proxy (Optional but Recommended)

To avoid CORS issues and make the API appear as part of your domain:

### Using Cloudflare Pages _redirects

The `public/_redirects` file is already configured. After deployment, edit it:

1. Open `public/_redirects`
2. Replace `YOUR_SUBDOMAIN` with your actual Worker subdomain:
   ```
   /api/*  https://streamfetch-worker.YOUR_SUBDOMAIN.workers.dev/api/:splat  200
   ```
3. Rebuild and redeploy:
   ```bash
   npm run build
   ```
4. Re-upload the `dist` folder to Cloudflare Pages

Now your frontend can call `/api/extract` instead of the full Worker URL.

---

## Step 4: Verify Deployment

### Test the Worker

```bash
curl -X POST https://streamfetch-worker.YOUR_SUBDOMAIN.workers.dev/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://harpalgeo.tv/program/Tapish/26573"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "page": { ... },
    "media": [ ... ]
  }
}
```

### Test the Frontend

1. Visit your Pages URL: `https://streamfetch.pages.dev` (or your custom domain)
2. Paste a video URL: `https://harpalgeo.tv/program/Tapish/26573`
3. Click "Extract Video"
4. You should see the video information and playback options

---

## Troubleshooting

### Error: "Could not detect a directory containing static files"

**Cause**: You're trying to use `wrangler deploy` on Cloudflare Pages.

**Solution**: 
- Cloudflare Pages uses its own build system
- Set build command to: `npm run build`
- Set output directory to: `dist`
- Do NOT use `wrangler deploy` for Pages

### Error: "Failed to fetch" or CORS errors

**Cause**: The frontend can't reach the Worker.

**Solution**:
1. Verify `VITE_WORKER_URL` environment variable is set correctly in Pages
2. Rebuild and redeploy the frontend
3. Check that the Worker is deployed and accessible
4. The Worker already has CORS headers enabled

### Error: "No publicly accessible video source was found"

**Cause**: The target website doesn't expose public video URLs, or uses DRM/authentication.

**Solution**:
- This is expected behavior for protected content
- Try a different URL with publicly accessible video
- Check the browser console for detailed error messages

### Worker deployment fails

**Cause**: Wrangler not authenticated or configuration issue.

**Solution**:
```bash
npx wrangler login
npx wrangler whoami  # Verify authentication
npx wrangler deploy
```

### Frontend shows old Worker URL after changing environment variable

**Cause**: Environment variables are baked into the build.

**Solution**:
1. Update `VITE_WORKER_URL` in Pages dashboard
2. Trigger a new deployment (redeploy from dashboard or push a commit)
3. Hard refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)

---

## Custom Domain (Optional)

### For Cloudflare Pages

1. Go to your Pages project → **Custom domains**
2. Click: **Set up a custom domain**
3. Enter your domain (e.g., `streamfetch.yourdomain.com`)
4. Follow DNS instructions
5. SSL certificate is automatic

### For Cloudflare Worker

1. Go to your Worker → **Triggers** → **Routes**
2. Click: **Add route**
3. Enter: `streamfetch.yourdomain.com/api/*`
4. Select your zone
5. Save

---

## Environment Variables Reference

### Frontend (Cloudflare Pages)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_WORKER_URL` | Yes | Worker API URL (e.g., `https://streamfetch-worker.xxx.workers.dev/api`) |

### Worker (Cloudflare Workers)

No environment variables required for the default free deployment.

---

## Deployment Checklist

- [ ] Worker deployed successfully
- [ ] Worker URL copied
- [ ] Frontend built with correct `VITE_WORKER_URL`
- [ ] Frontend deployed to Cloudflare Pages
- [ ] Test extraction with sample URL
- [ ] (Optional) Custom domain configured
- [ ] (Optional) API proxy configured via `_redirects`

---

## Architecture Summary

```
User Browser
    ↓
Cloudflare Pages (Frontend - React/Vite)
    ↓ POST /api/extract
Cloudflare Worker (Backend - JavaScript)
    ↓ fetch HTML
Target Website
    ↓
Worker extracts media URLs
    ↓
Returns JSON to Frontend
    ↓
Frontend displays results
    ↓
User accesses media directly (no proxy)
```

**Key Points:**
- Video files do NOT pass through the Worker
- Only URL discovery and lightweight validation occurs server-side
- Fully compatible with Cloudflare Free plan
- No database or paid services required
