import { ApiResponse } from '../types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || '/api';

export function validateUrl(url: string): { valid: boolean; message?: string } {
  if (!url) {
    return { valid: false, message: 'Please enter a URL.' };
  }

  if (url.length > 2048) {
    return { valid: false, message: 'URL is too long. Maximum 2048 characters.' };
  }

  // Reject dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'file:', 'vbscript:', 'ftp:'];
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
    const response = await fetch(`${WORKER_URL}/extract`, {
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

    const data = await response.json();
    return data;
  } catch (err) {
    throw new Error('Network error');
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
