/**
 * StreamFetch - Cloudflare Worker
 * Extracts publicly accessible video URLs from webpages.
 * Designed for Cloudflare Workers Free plan.
 */

import { extractMediaFromPage } from './extractor.js';
import { validateTargetUrl, isPrivateAddress } from './security.js';
import { validateMediaUrl } from './validator.js';

// Rate limiting using KV (optional) or in-memory for free plan
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health endpoint
    if (path === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'StreamFetch'
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Extract endpoint
    if (path === '/api/extract' && request.method === 'POST') {
      // Rate limiting
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const now = Date.now();
      
      if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, []);
      }
      
      const requests = rateLimitMap.get(clientIP).filter((t) => now - t < RATE_WINDOW);
      requests.push(now);
      rateLimitMap.set(clientIP, requests);

      if (requests.length > RATE_LIMIT) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please wait a moment and try again.'
          }
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      try {
        const body = await request.json();
        const targetUrl = body.url;

        if (!targetUrl || typeof targetUrl !== 'string') {
          return new Response(JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_URL',
              message: 'Please provide a valid URL.'
            }
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Validate URL
        const validation = validateTargetUrl(targetUrl);
        if (!validation.valid) {
          return new Response(JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_URL',
              message: validation.message
            }
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Check for direct media URL
        const directMedia = isDirectMediaUrl(targetUrl);
        if (directMedia.isMedia) {
          const mediaResult = await handleDirectMedia(targetUrl, directMedia.type);
          return new Response(JSON.stringify(mediaResult), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Fetch and extract
        const result = await extractMediaFromPage(targetUrl);
        
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'An internal error occurred. Please try again.'
          }
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

function isDirectMediaUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    if (path.includes('.m3u8')) return { isMedia: true, type: 'hls' };
    if (path.includes('.mp4')) return { isMedia: true, type: 'mp4' };
    if (path.includes('.webm')) return { isMedia: true, type: 'webm' };
    return { isMedia: false };
  } catch {
    return { isMedia: false };
  }
}

async function handleDirectMedia(url, type) {
  const parsed = new URL(url);
  const validation = await validateMediaUrl(url, type);
  
  return {
    success: true,
    data: {
      page: {
        url: url,
        title: `Direct ${type.toUpperCase()} Stream`,
        domain: parsed.hostname
      },
      media: [{
        type: type,
        url: url,
        quality: type === 'hls' ? 'adaptive' : 'unknown',
        verified: validation.valid,
        variants: validation.variants || []
      }]
    }
  };
}
