/**
 * Utility functions for the Worker.
 */

export function redactSensitiveParams(url) {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['token', 'sig', 'signature', 'key', 'secret', 'auth', 'password', 'pass'];
    
    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }
    
    return parsed.toString();
  } catch {
    return url;
  }
}

export function truncateString(str, maxLength = 200) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
