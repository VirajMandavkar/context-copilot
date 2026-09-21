// src/injector/detector.js — Input Element Detection
// Implements: SPEC-19 (priority chain input element finder)

/**
 * Well-known selectors for chat input elements, in priority order.
 * SPEC-19, priority 3.
 */
const WELL_KNOWN_SELECTORS = [
  '#prompt-textarea',                          // ChatGPT
  'div.ProseMirror[contenteditable="true"]',   // Claude / generic ProseMirror
  'div.ql-editor[contenteditable="true"]',     // Gemini
  'rich-textarea div[contenteditable="true"]', // Gemini custom element
  'div[contenteditable="true"][role="textbox"]', // Copilot / Gemini / accessible editors
  'textarea',                                  // Generic textarea fallback
  'div[contenteditable="true"]',               // Universal contenteditable fallback
];

/**
 * Check if an element is a suitable input target.
 * @param {Element} el
 * @returns {boolean}
 */
function isSuitableInput(el) {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

/**
 * Find the active input element on the page using SPEC-19's priority chain:
 * 1. document.activeElement if it is a <textarea> or has contenteditable="true"
 * 2. Query selector: textarea[data-id], div[contenteditable="true"][data-id]
 * 3. Well-known selectors (ChatGPT, ProseMirror, generic textarea)
 *
 * @returns {HTMLElement | null} The found element, or null if none found
 */
export function findInputElement() {
  // Priority 1: Active element (SPEC-19)
  const active = document.activeElement;
  if (isSuitableInput(active)) {
    return active;
  }

  // Priority 2: Data-id selectors (SPEC-19)
  const dataIdTargets = [
    'textarea[data-id]',
    'div[contenteditable="true"][data-id]',
  ];
  for (const selector of dataIdTargets) {
    const el = document.querySelector(selector);
    if (el) return el;
  }

  // Priority 3: Well-known selectors (SPEC-19)
  for (const selector of WELL_KNOWN_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }

  // SPEC-19 error: no suitable element found
  return null;
}
