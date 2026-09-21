// src/storage/thread-id.js — Thread ID derivation from URL
// Implements: SPEC-1 §2.4 (thread_id extraction)

/**
 * Known host patterns for direct thread ID extraction.
 * Each entry: { hostPatterns: string[], extract: (url: URL) => string | null }
 */
const HOST_PATTERNS = [
  {
    // SPEC-1 §2.4, row 1: ChatGPT — /c/<id> or /g/<gid>/c/<id>
    hostPatterns: ['chatgpt.com', 'chat.openai.com'],
    extract(url) {
      const segments = url.pathname.replace(/\/+$/, '').split('/');
      // Find the last /c/<id> segment pair
      for (let i = segments.length - 1; i >= 1; i--) {
        if (segments[i - 1] === 'c' && segments[i]) {
          return segments[i];
        }
      }
      return null;
    },
  },
  {
    // SPEC-1 §2.4, row 2: Claude — /chat/<id>
    hostPatterns: ['claude.ai'],
    extract(url) {
      const segments = url.pathname.replace(/\/+$/, '').split('/');
      // Match /chat/<id> where <id> is non-empty
      for (let i = segments.length - 1; i >= 1; i--) {
        if (segments[i - 1] === 'chat' && segments[i]) {
          return segments[i];
        }
      }
      return null;
    },
  },
  {
    // Gemini — /app/<id>
    hostPatterns: ['gemini.google.com'],
    extract(url) {
      const segments = url.pathname.replace(/\/+$/, '').split('/');
      for (let i = segments.length - 1; i >= 1; i--) {
        if (segments[i - 1] === 'app' && segments[i]) {
          return segments[i];
        }
      }
      return null;
    },
  },
];

/**
 * Compute SHA-256 hash of a string, return first 16 hex chars.
 * SPEC-1 §2.4, row 3: Fallback for unknown hosts.
 * Uses SubtleCrypto (available in content scripts and service workers).
 * @param {string} input
 * @returns {Promise<string>} 16-char hex string
 */
async function sha256Hex16(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 16);
}

/**
 * Extract a thread_id from the given URL string.
 * SPEC-1 §2.4: Deterministic derivation using known host patterns
 * with SHA-256 fallback for unknown hosts.
 *
 * @param {string} urlString — Full URL of the active chat page
 * @returns {string | Promise<string>} — Thread ID (sync for known hosts, async for fallback)
 */
export function extractThreadId(urlString) {
  const url = new URL(urlString);
  const hostname = url.hostname;

  // Try each known host pattern
  for (const pattern of HOST_PATTERNS) {
    if (pattern.hostPatterns.some((h) => hostname === h || hostname.endsWith('.' + h))) {
      const id = pattern.extract(url);
      if (id) return id;
    }
  }

  // SPEC-1 §2.4, row 3: Fallback — SHA-256(origin + pathname + search)
  // User decision: include search params for query-param-based chat UIs
  const hashInput = url.origin + url.pathname + url.search;
  return sha256Hex16(hashInput);
}
