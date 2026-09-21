// src/storage/reactivity.js — Cross-context reactivity
// Implements: SPEC-6 (Storage changes trigger UI re-renders)

let currentListener = null;

/**
 * Starts listening to chrome.storage.onChanged for a specific thread.
 * Starts listening to chrome.storage.onChanged for a specific session.
 * SPEC-6: Fires callback when changes occur in any extension context.
 *
 * @param {string} sessionId - The ID of the session to watch
 * @param {Function} onStateChanged - Callback invoked with the new ThreadState
 */
export function startStorageReactivity(sessionId, onStateChanged) {
  // Clean up any existing listener before starting a new one
  stopStorageReactivity();

  const targetKey = 'cc_session:' + sessionId;
  console.log(`[ContextCopilot] Reactivity started for ${targetKey}`);

  currentListener = (changes, areaName) => {
    if (areaName === 'local') {
      if (changes[targetKey]) {
        console.log(`[ContextCopilot] Storage changed for ${targetKey}:`, changes[targetKey]);
        const newValue = changes[targetKey].newValue || null;
        console.log('[ContextCopilot] Triggering UI render with new state');
        onStateChanged(newValue);
      }
    }
  };

  chrome.storage.onChanged.addListener(currentListener);
}

/**
 * Stops listening to storage changes.
 */
export function stopStorageReactivity() {
  if (currentListener) {
    chrome.storage.onChanged.removeListener(currentListener);
    currentListener = null;
  }
}
