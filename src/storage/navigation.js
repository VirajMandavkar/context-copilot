// src/storage/navigation.js — SPA Navigation Detection
// Implements: SPEC-5 (webNavigation + MutationObserver fallback)

import { extractThreadId } from './thread-id.js';

let currentThreadId = null;
let currentUrl = null;
let messageListener = null;
let observer = null;

/**
 * Handle a URL change. Extracts new thread ID and fires callback if changed.
 * @param {string} url 
 * @param {Function} onThreadChange 
 */
async function handleUrlChange(url, onThreadChange) {
  if (!chrome.runtime?.id) return;
  if (url === currentUrl) return;
  currentUrl = url;

  try {
    const newThreadId = await extractThreadId(url);
    if (!chrome.runtime?.id) return;
    if (newThreadId !== currentThreadId) {
      currentThreadId = newThreadId;
      await onThreadChange(newThreadId);
    }
  } catch (err) {
    if (err?.message?.includes('Extension context invalidated')) {
      return;
    }
    console.log('[ContextCopilot] URL change error:', err);
  }
}

/**
 * Starts monitoring for SPA navigation.
 * SPEC-5: Listens to webNavigation messages from background,
 * falls back to MutationObserver polling location.href.
 *
 * @param {Function} onThreadChange - Callback invoked with new threadId
 */
export async function startNavigationTracker(onThreadChange) {
  if (!chrome.runtime?.id) return;
  currentUrl = window.location.href;
  currentThreadId = await extractThreadId(currentUrl);

  // Fire immediately for the initial page load
  try {
    await onThreadChange(currentThreadId);
  } catch (err) {
    if (err?.message?.includes('Extension context invalidated')) return;
    throw err;
  }

  // 1. Primary path: listen for background script messages
  messageListener = async (message) => {
    if (!chrome.runtime?.id) return;
    if (message.type === 'CC_URL_CHANGED' && message.url) {
      await handleUrlChange(message.url, onThreadChange);
    }
  };
  chrome.runtime.onMessage.addListener(messageListener);

  // 2. Fallback path: MutationObserver on document.body
  // Catches client-side routing if background webNavigation fails or lacks permission
  observer = new MutationObserver(async () => {
    if (!chrome.runtime?.id) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      return;
    }
    const activeUrl = window.location.href;
    if (activeUrl !== currentUrl) {
      await handleUrlChange(activeUrl, onThreadChange);
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

/**
 * Stops monitoring navigation. Useful for testing/cleanup.
 */
export function stopNavigationTracker() {
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
    messageListener = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  currentThreadId = null;
  currentUrl = null;
}
