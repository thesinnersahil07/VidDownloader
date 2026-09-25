/**
 * HLS Playlist Parser
 * Parses M3U8 master and media playlists.
 */

export function parseHlsPlaylist(content, baseUrl) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (!lines[0] || !lines[0].startsWith('#EXTM3U')) {
    return { type: 'invalid', variants: [] };
  }

  const variants = [];
  let currentVariant = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse stream info
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      const attrs = parseAttributes(line.substring('#EXT-X-STREAM-INF:'.length));
      currentVariant = {
        bandwidth: parseInt(attrs.BANDWIDTH) || 0,
        resolution: attrs.RESOLUTION || null,
        codecs: attrs.CODECS || null,
        frameRate: parseFloat(attrs['FRAME-RATE']) || null,
        url: null,
        label: null
      };

      // Generate label from resolution
      if (currentVariant.resolution) {
        const height = currentVariant.resolution.split('x')[1];
        if (height) {
          currentVariant.label = `${height}p`;
        }
      }
      continue;
    }

    // URL line following EXT-X-STREAM-INF
    if (currentVariant && !line.startsWith('#')) {
      let url = line;
      try {
        url = new URL(url, baseUrl).href;
      } catch {
        // Keep as-is
      }
      currentVariant.url = url;
      variants.push(currentVariant);
      currentVariant = null;
      continue;
    }
  }

  if (variants.length > 0) {
    // Sort by bandwidth descending
    variants.sort((a, b) => b.bandwidth - a.bandwidth);
    return { type: 'master', variants };
  }

  return { type: 'media', variants: [] };
}

function parseAttributes(str) {
  const attrs = {};
  const regex = /([A-Z0-9-]+)=(?:"([^"]+)"|([^,]+))/g;
  let match;
  
  while ((match = regex.exec(str)) !== null) {
    attrs[match[1]] = match[2] || match[3];
  }
  
  return attrs;
}
