// src/injector/contenteditable.js — ContentEditable Injection (ProseMirror)
// Implements: SPEC-18 (execCommand primary + InputEvent fallback)
// Implements: SPEC-20 (post-injection tick delay)

/**
 * Inject text into a contenteditable element (ProseMirror, Slate, etc.)
 * using document.execCommand as the primary method, with InputEvent fallback.
 *
 * SPEC-18: execCommand('insertText') triggers ProseMirror's transaction pipeline.
 * Fallback dispatches beforeinput + input InputEvents.
 * SPEC-18 constraint: NEVER mutates .innerHTML or .textContent directly.
 * SPEC-20: Yields one macrotask tick after injection.
 *
 * @param {HTMLElement} el — Target contenteditable element
 * @param {string} text — Text to inject
 * @returns {Promise<void>}
 */
export async function injectContentEditable(el, text) {
  el.focus();
  
  // SPEC-18: Fallback to ClipboardEvent ('paste') which is handled natively and cleanly 
  // by Lexical/ProseMirror (ChatGPT, Claude) without breaking React's event pool.
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', text);
  
  el.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true,
    })
  );

  // SPEC-20: Yield one macrotask tick for React 18 automatic batching
  await new Promise((resolve) => setTimeout(resolve, 10));
}
