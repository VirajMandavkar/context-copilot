// src/injector/textarea.js — Textarea Injection (React Controlled Input)
// Implements: SPEC-17 (native setter bypass + _valueTracker reset)
// Implements: SPEC-20 (post-injection tick delay)

/**
 * Inject text into a React-controlled <textarea> by bypassing React's
 * patched .value setter and resetting the internal _valueTracker.
 *
 * SPEC-17: Uses native HTMLTextAreaElement.prototype.value setter,
 * resets _valueTracker, dispatches input + change events with bubbles: true.
 * SPEC-20: Yields one macrotask tick after dispatch.
 *
 * @param {HTMLTextAreaElement} el — Target textarea element
 * @param {string} text — Text to inject
 * @returns {Promise<void>}
 */
export async function injectTextarea(el, text) {
  // Focus the element (SPEC-17)
  el.focus();

  // Use the native setter from HTMLTextAreaElement.prototype
  // to bypass React's patched setter (SPEC-17)
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(el, text);
  } else {
    // Graceful degradation if prototype descriptor unavailable
    el.value = text;
  }

  // Reset React's _valueTracker so onChange sees a delta (SPEC-17)
  // Error recovery: skip if _valueTracker doesn't exist
  if (el._valueTracker) {
    el._valueTracker.setValue('');
  }

  // Dispatch native events with bubbles: true (SPEC-17, §4.3)
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));

  // SPEC-20: Yield one macrotask tick for React 18 automatic batching
  await new Promise((resolve) => setTimeout(resolve, 0));
}
