import { ApiResponse } from '../types';

// Worker URL configuration
// In production, set VITE_WORKER_URL environment variable in Cloudflare Pages
// For local development, create a .env file with VITE_WORKER_URL=http://localhost:8787/api
// If using _redirects proxy, leave empty and it will use /api (same origin)
const WORKER_URL = import.meta.env.VITE_WORKER_URL || '/api';

export function validateUrl(url: string): { valid: boolean; message?: string } {
  if (!url) {
    return { valid: false, message: 'Please enter a URL.' };
  }

  if (url.length > 2048) {
    return { valid: false, message: 'URL is too long. Maximum 2048 characters.' };
  }

  // Reject dangerous protocols
  const dangerousProtocols = ['javascript:', '', 'file:', 'vbscript:', 'ftp:'];
  const lowerUrl = url.toLowerCase().trim();
  for (const proto of dangerousProtocols) {
    if (lowerUrl.startsWith(proto)) {
      return { valid: false, message: `Protocol "${proto.replace(':', '')}" is not supported. Use HTTP or HTTPS.` };
    }
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, message: 'Only HTTP and HTTPS URLs are supported.' };
    }
    if (!parsed.hostname) {
      return { valid: false, message: 'Invalid URL format.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: 'Please enter a valid URL (e.g., https://example.com/video).' };
  }
}

export function isDirectMediaUrl(url: string): { isMedia: boolean; type?: string } {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    if (pathname.includes('.m3u8')) {
      return { isMedia: true, type: 'hls' };
    }
    if (pathname.includes('.mp4')) {
      return { isMedia: true, type: 'mp4' };
    }
    if (pathname.includes('.webm')) {
      return { isMedia: true, type: 'webm' };
    }
    return { isMedia: false };
  } catch {
    return { isMedia: false };
  }
}

export async function extractVideo(url: string): Promise<ApiResponse> {
  // Check if it's a direct media URL
  const directCheck = isDirectMediaUrl(url);
  if (directCheck.isMedia) {
    return handleDirectMediaUrl(url, directCheck.type!);
  }

  try {
    const endpoint = `${WORKER_URL}/extract`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (response.status === 429) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.'
        }
      };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: `Server error (${response.status}). Please try again later.`
        }
      };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    // Check if it's a configuration issue
    if (WORKER_URL === '/api') {
      return {
        success: false,
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'The extraction service is not configured. Please set VITE_WORKER_URL environment variable or configure the _redirects proxy. See DEPLOYMENT.md for instructions.'
        }
      };
    }
    
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Could not connect to the extraction service. Please check your connection and try again.'
      }
    };
  }
}

function handleDirectMediaUrl(url: string, type: string): ApiResponse {
  const mediaType = type === 'hls' ? 'hls' : type === 'mp4' ? 'mp4' : 'webm';
  const parsed = new URL(url);
  
  return {
    success: true,
    data: {
      page: {
        url: url,
        title: `Direct ${mediaType.toUpperCase()} Stream`,
        domain: parsed.hostname
      },
      media: [{
        type: mediaType as 'hls' | 'mp4' | 'webm',
        url: url,
        quality: mediaType === 'hls' ? 'adaptive' : 'unknown',
        verified: true
      }]
    }
  };
}
