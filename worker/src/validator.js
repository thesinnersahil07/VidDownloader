/**
 * Media URL Validator
 * Lightweight validation of detected media URLs.
 */

import { parseHlsPlaylist } from './hls.js';

const VALIDATION_TIMEOUT = 8000;

export async function validateMediaUrl(url, type) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);

    // Use Range request to avoid downloading full content
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok && response.status !== 206 && response.status !== 200) {
      return { valid: false, variants: [] };
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();

    if (type === 'hls') {
      // Accept various HLS content types
      const hlsTypes = [
        'application/vnd.apple.mpegurl',
        'application/x-mpegurl',
        'audio/mpegurl',
        'audio/x-mpegurl',
        'application/octet-stream',
        'text/plain',
      ];
      
      const isHls = hlsTypes.some(t => contentType.includes(t)) || 
                    url.toLowerCase().includes('.m3u8');
      
      if (!isHls) {
        return { valid: false, variants: [] };
      }

      // Try to parse the playlist
      try {
        const body = await response.text();
        const parsed = parseHlsPlaylist(body, url);
        
        if (parsed.type === 'master') {
          return { valid: true, variants: parsed.variants };
        }
        
        return { valid: true, variants: [] };
      } catch {
        // If we can't parse but got a valid response, still mark as valid
        return { valid: true, variants: [] };
      }
    }

    if (type === 'mp4') {
      const mp4Types = ['video/mp4', 'application/octet-stream', 'application/mp4'];
      const isMp4 = mp4Types.some(t => contentType.includes(t)) || 
                    url.toLowerCase().includes('.mp4');
      return { valid: isMp4, variants: [] };
    }

    if (type === 'webm') {
      const webmTypes = ['video/webm', 'application/octet-stream'];
      const isWebm = webmTypes.some(t => contentType.includes(t)) || 
                     url.toLowerCase().includes('.webm');
      return { valid: isWebm, variants: [] };
    }

    return { valid: false, variants: [] };

  } catch (err) {
    // If validation fails, still return the URL but mark as unverified
    return { valid: false, variants: [] };
  }
}
