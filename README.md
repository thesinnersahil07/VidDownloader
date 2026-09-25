# StreamFetch — Public Video URL Extractor

A production-ready web application that extracts publicly accessible video sources (HLS, MP4, WebM) from webpages. Built entirely on **Cloudflare Free plan** (Pages + Workers).

## 🎯 Purpose

StreamFetch helps users discover publicly exposed video sources on webpages — especially useful on mobile devices where inspecting page source is difficult.

## 🏗️ Architecture

```
Cloudflare Pages (Frontend)
        |
        | POST /api/extract
        v
Cloudflare Worker (Free Plan)
        |
        | fetch public webpage
        v
Target Website
        |
        v
Extract public media URL
        |
        v
Worker returns JSON → Frontend
        |
        +------> HLS/CDN directly (no proxy)
        +------> MP4/CDN directly (no proxy)
```

**Important:** Large video files do NOT pass through the Worker. Only URL discovery and lightweight validation occurs server-side.

## 📁 Project Structure

```
streamfetch/
├── frontend (this directory - React/Vite/Tailwind)
│   ├── src/
│   │   ├── App.tsx              # Main application
│   │   ├── components/          # UI components
│   │   ├── utils/               # API utilities
│   │   ├── types.ts             # TypeScript types
│   │   └── index.css            # Tailwind + custom styles
│   ├── public/
│   │   ├── manifest.json        # PWA manifest
│   │   ├── sw.js                # Service worker
│   │   └── robots.txt           # SEO
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── worker/                      # Cloudflare Worker
│   ├── src/
│   │   ├── index.js             # Worker entry point
│   │   ├── extractor.js         # Media extraction logic
│   │   ├── hls.js               # HLS playlist parser
│   │   ├── security.js          # SSRF protection
│   │   ├── validator.js         # Media URL validation
│   │   └── utils.js             # Utility functions
│   ├── wrangler.toml            # Worker configuration
│   └── package.json
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm
- Cloudflare account (free)

### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### 2. Worker Setup

```bash
cd worker

# Install Wrangler
npm install

# Login to Cloudflare
npx wrangler login

# Run locally for development
npx wrangler dev

# Deploy to Cloudflare
npx wrangler deploy
```

### 3. Connect Frontend to Worker

Set the Worker URL in the frontend. Create a `.env` file in the frontend root:

```
VITE_WORKER_URL=https://streamfetch-worker.<your-subdomain>.workers.dev/api
```

For local development with the Worker running locally:

```
VITE_WORKER_URL=http://localhost:8787/api
```

## 🌐 Deployment

### Deploy Worker

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

Note the deployed URL (e.g., `https://streamfetch-worker.xxx.workers.dev`).

### Deploy Frontend to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Create a new project
3. Connect your Git repository OR upload the `dist/` folder
4. Build command: `npm run build`
5. Output directory: `dist`
6. Set environment variable: `VITE_WORKER_URL` = your worker URL
7. Deploy!

Alternatively, use Wrangler for Pages:

```bash
npm run build
npx wrangler pages deploy dist --project-name=streamfetch
```

### Custom Domain (Optional)

1. In Cloudflare Pages dashboard → Custom domains
2. Add your domain
3. Follow DNS configuration instructions
4. SSL is automatic

## 🔧 Configuration

### Environment Variables

**No environment variables are required for the default free deployment.**

Optional:
- `VITE_WORKER_URL` — Worker API URL (defaults to `/api` for same-origin)

### Worker Configuration

Edit `worker/wrangler.toml` to customize:
- Worker name
- Rate limits
- Compatibility date

## 🛡️ Security Features

- **SSRF Protection**: Blocks requests to private IPs, localhost, metadata endpoints
- **Rate Limiting**: 10 requests per IP per minute
- **Response Size Limit**: 5MB max HTML processing
- **Timeout**: 15-second fetch timeout
- **No Credential Theft**: Does not send or store cookies/auth
- **No DRM Bypass**: Only accesses publicly available content
- **URL Validation**: Strict protocol and format checking
- **Redirect Limits**: Prevents redirect abuse

## 📱 Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| HLS | .m3u8 | Adaptive streaming, parsed for quality variants |
| MP4 | .mp4 | Direct download where supported |
| WebM | .webm | Open format, browser-native playback |

## 🔌 API Reference

### POST /api/extract

Extract media from a webpage.

**Request:**
```json
{
  "url": "https://example.com/video-page"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "page": {
      "url": "https://example.com/video-page",
      "title": "Example Video",
      "domain": "example.com"
    },
    "media": [
      {
        "type": "hls",
        "url": "https://cdn.example.com/master.m3u8",
        "quality": "adaptive",
        "verified": true,
        "variants": [
          {
            "url": "https://cdn.example.com/1080p.m3u8",
            "resolution": "1920x1080",
            "bandwidth": 5000000,
            "label": "1080p"
          }
        ]
      }
    ]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "NO_PUBLIC_MEDIA_FOUND",
    "message": "No publicly accessible video source was found."
  }
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "StreamFetch"
}
```

## 📋 Error Codes

| Code | Description |
|------|-------------|
| `INVALID_URL` | URL is malformed or uses unsupported protocol |
| `PAGE_NOT_FOUND` | Source page returned 404 or couldn't be reached |
| `ACCESS_DENIED` | Source website returned 403/401 |
| `NO_PUBLIC_MEDIA_FOUND` | No video sources detected |
| `DRM` | Protected content detected |
| `TIMEOUT` | Source website took too long to respond |
| `CORS` | Stream doesn't allow browser playback |
| `EXPIRED` | Stream URL has expired |
| `RATE_LIMITED` | Too many requests |
| `UNSUPPORTED` | Media format not supported |

## 💰 Cloudflare Free Plan Limits

This project is designed to work within Cloudflare Workers Free plan:

- 100,000 requests/day
- 10ms CPU time per request
- No large video proxying
- Minimal external requests
- Max 2 levels of iframe inspection

## 📄 Download Instructions

### For MP4
- Click "Download" button (browser-dependent)
- Or open the URL directly and save

### For HLS (.m3u8)
Use FFmpeg to convert to MP4:

```bash
ffmpeg -i "M3U8_URL" -c copy "video.mp4"
```

Available on Windows, Linux, and macOS. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html).

## ⚖️ Legal Notice

This tool is intended for publicly accessible media and authorized use. It does not bypass DRM, authentication, paywalls, or access controls. Users are responsible for respecting copyright and the terms of the source website.

## 🧪 Testing

Test with the extraction API:

```bash
curl -X POST https://your-worker.workers.dev/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://harpalgeo.tv/program/Tapish/26573"}'
```

## 📱 Mobile Usage

The application is designed for mobile-first usage:
- Paste URL → Extract → Preview → Copy URL → Open/Download
- No Developer Tools required
- No desktop needed
- Works on Android Chrome/Firefox, iPhone Safari, iPad

## License

MIT
