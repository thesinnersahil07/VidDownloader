/**
 * StreamFetch Extractor
 * Fetches a webpage and extracts publicly exposed media URLs.
 */

import { parseHlsPlaylist } from './hls.js';
import { validateMediaUrl } from './validator.js';

const MAX_HTML_SIZE = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT = 15000; // 15 seconds
const MAX_IFRAME_DEPTH = 2;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function extractMediaFromPage(targetUrl, depth = 0) {
  try {
    // Fetch the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'The source website denied the request. The extractor cannot bypass this restriction.'
          }
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: 'The source page could not be found.'
          }
        };
      }
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: `The source page returned HTTP ${response.status}.`
        }
      };
    }

    // Read response with size limit
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalSize += value.length;
      if (totalSize > MAX_HTML_SIZE) {
        return {
          success: false,
          error: {
            code: 'PAGE_TOO_LARGE',
            message: 'Source page is too large to analyze.'
          }
        };
      }
      
      html += decoder.decode(value, { stream: true });
    }

    html += decoder.decode();

    // Extract page info
    const pageInfo = extractPageInfo(html, targetUrl);

    // Extract media candidates
    const candidates = extractMediaCandidates(html, targetUrl);

    // Check for iframes
    if (depth < MAX_IFRAME_DEPTH) {
      const iframes = extractIframes(html, targetUrl);
      for (const iframeUrl of iframes) {
        try {
          const iframeResult = await extractMediaFromPage(iframeUrl, depth + 1);
          if (iframeResult.success && iframeResult.data?.media?.length > 0) {
            candidates.push(...iframeResult.data.media);
          }
        } catch (e) {
          // Skip iframe errors
        }
      }
    }

    // Deduplicate
    const uniqueCandidates = deduplicateCandidates(candidates);

    // Score and rank
    const ranked = scoreAndRank(uniqueCandidates);

    if (ranked.length === 0) {
      return {
        success: false,
        error: {
          code: 'NO_PUBLIC_MEDIA_FOUND',
          message: 'No publicly accessible video source was found on this page.'
        }
      };
    }

    // Validate top candidates
    const validated = [];
    for (let i = 0; i < Math.min(ranked.length, 5); i++) {
      const candidate = ranked[i];
      const validation = await validateMediaUrl(candidate.url, candidate.type);
      validated.push({
        ...candidate,
        verified: validation.valid,
        variants: validation.variants || []
      });
    }

    // Filter out unverified if we have verified ones
    const verifiedOnes = validated.filter(v => v.verified);
    const finalMedia = verifiedOnes.length > 0 ? verifiedOnes : validated;

    return {
      success: true,
      data: {
        page: pageInfo,
        media: finalMedia.slice(0, 5)
      }
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'The source website took too long to respond.'
        }
      };
    }

    if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
      return {
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: 'Could not connect to the source website.'
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An error occurred while processing the page.'
      }
    };
  }
}

function extractPageInfo(html, url) {
  let title = '';
  const parsedUrl = new URL(url);

  // Try og:title
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitleMatch) {
    title = decodeHtmlEntities(ogTitleMatch[1]);
  }

  // Try <title>
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = decodeHtmlEntities(titleMatch[1].trim());
    }
  }

  // Try <h1>
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) {
      title = decodeHtmlEntities(h1Match[1].trim());
    }
  }

  if (!title) {
    title = parsedUrl.hostname;
  }

  return {
    url: url,
    title: title,
    domain: parsedUrl.hostname
  };
}

function extractMediaCandidates(html, baseUrl) {
  const candidates = [];
  const seen = new Set();

  // Helper to add candidate
  function addCandidate(url, type, score, source) {
    if (!url || seen.has(url)) return;
    if (url.length < 10) return;
    
    // Filter out obvious non-video URLs
    const lowerUrl = url.toLowerCase();
    if (isLikelyAdOrTracking(lowerUrl)) return;
    if (isLikelyImage(lowerUrl)) return;
    
    seen.add(url);
    candidates.push({ url, type, score, source });
  }

  // 1. HTML video elements
  const videoSrcRegex = /<video[^>]*\ssrc=["']([^"']+)["']/gi;
  let match;
  while ((match = videoSrcRegex.exec(html)) !== null) {
    const resolvedUrl = resolveUrl(match[1], baseUrl);
    if (resolvedUrl) {
      const type = detectMediaType(resolvedUrl);
      if (type) addCandidate(resolvedUrl, type, 80, 'video-tag');
    }
  }

  // 2. Source elements within video
  const sourceRegex = /<source[^>]*\ssrc=["']([^"']+)["'][^>]*type=["']([^"']+)["']/gi;
  while ((match = sourceRegex.exec(html)) !== null) {
    const resolvedUrl = resolveUrl(match[1], baseUrl);
    const mimeType = match[2].toLowerCase();
    if (resolvedUrl) {
      let type = null;
      if (mimeType.includes('mpegurl') || mimeType.includes('m3u8')) type = 'hls';
      else if (mimeType.includes('mp4')) type = 'mp4';
      else if (mimeType.includes('webm')) type = 'webm';
      else type = detectMediaType(resolvedUrl);
      
      if (type) addCandidate(resolvedUrl, type, 80, 'source-tag');
    }
  }

  // 3. Source elements without type
  const sourceNoTypeRegex = /<source[^>]*\ssrc=["']([^"']+)["']/gi;
  while ((match = sourceNoTypeRegex.exec(html)) !== null) {
    const resolvedUrl = resolveUrl(match[1], baseUrl);
    if (resolvedUrl) {
      const type = detectMediaType(resolvedUrl);
      if (type) addCandidate(resolvedUrl, type, 75, 'source-tag');
    }
  }

  // 4. Data attributes
  const dataAttrs = ['data-src', 'data-video', 'data-url', 'data-stream', 'data-source', 'data-file', 'data-hls', 'data-m3u8'];
  for (const attr of dataAttrs) {
    const attrRegex = new RegExp(`${attr}=["']([^"']+)["']`, 'gi');
    while ((match = attrRegex.exec(html)) !== null) {
      const resolvedUrl = resolveUrl(decodeHtmlEntities(match[1]), baseUrl);
      if (resolvedUrl) {
        const type = detectMediaType(resolvedUrl);
        if (type) {
          const score = attr.includes('hls') || attr.includes('m3u8') ? 85 : 70;
          addCandidate(resolvedUrl, type, score, 'data-attr');
        }
      }
    }
  }

  // 5. Open Graph video
  const ogVideoRegex = /<meta[^>]*property=["']og:video(?::url|:secure_url)?["'][^>]*content=["']([^"']+)["']/gi;
  while ((match = ogVideoRegex.exec(html)) !== null) {
    const resolvedUrl = resolveUrl(match[1], baseUrl);
    if (resolvedUrl) {
      const type = detectMediaType(resolvedUrl);
      if (type) addCandidate(resolvedUrl, type, 50, 'og-meta');
    }
  }

  // 6. Twitter player stream
  const twitterRegex = /<meta[^>]*name=["']twitter:player:stream["'][^>]*content=["']([^"']+)["']/gi;
  while ((match = twitterRegex.exec(html)) !== null) {
    const resolvedUrl = resolveUrl(match[1], baseUrl);
    if (resolvedUrl) {
      const type = detectMediaType(resolvedUrl);
      if (type) addCandidate(resolvedUrl, type, 50, 'twitter-meta');
    }
  }

  // 7. JSON embedded data
  const jsonKeys = ['video', 'videoUrl', 'video_url', 'stream', 'streamUrl', 'stream_url', 'source', 'sources', 'file', 'media', 'playlist', 'hls', 'm3u8', 'src', 'url', 'file_url', 'videoSrc', 'streamUrl', 'hlsUrl', 'mp4Url'];
  
  // Extract from script tags
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1];
    if (scriptContent.length > 100000) continue; // Skip huge scripts
    
    for (const key of jsonKeys) {
      // Match "key": "url" or 'key': 'url' or key=url patterns
      const keyRegex = new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']([^"']+)["']`, 'gi');
      let jsonMatch;
      while ((jsonMatch = keyRegex.exec(scriptContent)) !== null) {
        const potentialUrl = decodeHtmlEntities(jsonMatch[1]);
        const resolvedUrl = resolveUrl(potentialUrl, baseUrl);
        if (resolvedUrl) {
          const type = detectMediaType(resolvedUrl);
          if (type) {
            const score = (key.includes('hls') || key.includes('m3u8')) ? 90 : 40;
            addCandidate(resolvedUrl, type, score, 'json-embedded');
          }
        }
      }
    }
  }

  // 8. Direct URL patterns in HTML (m3u8, mp4, webm)
  const urlPatternRegex = /https?:\/\/[^\s"'<>\\]+\.(m3u8|mp4|webm)(\?[^\s"'<>\\]*)?/gi;
  while ((match = urlPatternRegex.exec(html)) !== null) {
    const url = decodeHtmlEntities(match[0]);
    const type = detectMediaType(url);
    if (type) {
      const score = type === 'hls' ? 70 : 60;
      addCandidate(url, type, score, 'url-pattern');
    }
  }

  return candidates;
}

function extractIframes(html, baseUrl) {
  const iframes = [];
  const iframeRegex = /<iframe[^>]*\ssrc=["']([^"']+)["']/gi;
  let match;
  
  while ((match = iframeRegex.exec(html)) !== null) {
    const src = decodeHtmlEntities(match[1]);
    const resolved = resolveUrl(src, baseUrl);
    if (resolved && !isLikelyAdOrTracking(resolved.toLowerCase())) {
      // Only follow iframes that might contain video players
      const lower = resolved.toLowerCase();
      if (lower.includes('player') || lower.includes('video') || lower.includes('embed') || lower.includes('watch')) {
        iframes.push(resolved);
      }
    }
  }
  
  return iframes.slice(0, 3); // Max 3 iframes
}

function detectMediaType(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    
    if (pathname.includes('.m3u8') || parsed.search.toLowerCase().includes('.m3u8')) {
      return 'hls';
    }
    if (pathname.includes('.mp4')) {
      return 'mp4';
    }
    if (pathname.includes('.webm')) {
      return 'webm';
    }
    return null;
  } catch {
    return null;
  }
}

function resolveUrl(url, baseUrl) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:')) {
    return null;
  }
  
  try {
    // Decode HTML entities
    url = decodeHtmlEntities(url);
    // Trim whitespace
    url = url.trim();
    
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    
    const resolved = new URL(url, baseUrl);
    return resolved.href;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#47;/g, '/')
    .replace(/&apos;/g, "'")
    .replace(/\\u0026/g, '&')
    .replace(/\\u003C/g, '<')
    .replace(/\\u003E/g, '>')
    .replace(/\\\//g, '/');
}

function isLikelyAdOrTracking(url) {
  const adPatterns = [
    'doubleclick', 'googlesyndication', 'googleadservices',
    'adnxs', 'adsrvr', 'advertising', 'adsystem',
    'tracking', 'analytics', 'telemetry',
    'pixel', 'beacon', 'tracker'
  ];
  return adPatterns.some(p => url.includes(p));
}

function isLikelyImage(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp'];
  const lower = url.toLowerCase().split('?')[0];
  return imageExtensions.some(ext => lower.endsWith(ext));
}

function deduplicateCandidates(candidates) {
  const seen = new Map();
  for (const c of candidates) {
    const key = c.url;
    if (!seen.has(key) || seen.get(key).score < c.score) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

function scoreAndRank(candidates) {
  return candidates.sort((a, b) => b.score - a.score);
}
