/**
 * Security Module
 * SSRF protection and URL validation for the Worker.
 */

export function validateTargetUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, message: 'URL is required.' };
  }

  if (url.length > 2048) {
    return { valid: false, message: 'URL is too long.' };
  }

  // Reject dangerous protocols
  const lower = url.toLowerCase().trim();
  const dangerous = ['javascript:', 'data:', 'file:', 'vbscript:', 'ftp:', 'blob:'];
  for (const proto of dangerous) {
    if (lower.startsWith(proto)) {
      return { valid: false, message: `Protocol "${proto.replace(':', '')}" is not allowed.` };
    }
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, message: 'Invalid URL format.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, message: 'Only HTTP and HTTPS URLs are supported.' };
  }

  if (!parsed.hostname) {
    return { valid: false, message: 'URL must have a valid hostname.' };
  }

  // Check for private/internal addresses
  if (isPrivateAddress(parsed.hostname)) {
    return { valid: false, message: 'Access to internal network addresses is not allowed.' };
  }

  return { valid: true };
}

export function isPrivateAddress(hostname) {
  // Remove brackets for IPv6
  const host = hostname.replace(/[\[\]]/g, '').toLowerCase();

  // localhost
  if (host === 'localhost' || host === 'localhost.localdomain') {
    return true;
  }

  // IPv4 checks
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = host.match(ipv4Regex);
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (private)
    if (a === 10) return true;
    // 172.16.0.0/12 (private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (private)
    if (a === 192 && b === 168) return true;
    // 0.0.0.0
    if (a === 0 && b === 0 && c === 0 && d === 0) return true;
    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;
  }

  // IPv6 checks
  if (host.includes(':')) {
    // ::1 (loopback)
    if (host === '::1' || host === '0:0:0:0:0:0:0:1') return true;
    // fe80::/10 (link-local)
    if (host.startsWith('fe80:') || host.startsWith('fe80')) return true;
    // fc00::/7 (unique local)
    if (host.startsWith('fc') || host.startsWith('fd')) return true;
    // ::ffff:127.0.0.1 (IPv4-mapped loopback)
    if (host.startsWith('::ffff:127.') || host.startsWith('::ffff:10.') || 
        host.startsWith('::ffff:192.168.') || host.startsWith('::ffff:0.')) return true;
  }

  // Cloud metadata endpoints
  const metadataHosts = [
    '169.254.169.254',
    'metadata.google.internal',
    'metadata',
    'kubernetes.default.svc',
  ];
  if (metadataHosts.includes(host)) return true;

  return false;
}
