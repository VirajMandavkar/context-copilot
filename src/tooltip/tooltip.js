// src/tooltip/tooltip.js — DOM Tooltip Module
// Implements: SPEC-7, 8, 9, 10

import { addItem } from '../storage/engine.js';
// We'd normally import CSS as a string, but for MVP without a bundler plugin,
// we'll inject standard raw CSS text directly.
const TOOLTIP_CSS = `
  .cc-tooltip {
    position: absolute;
    background: rgba(18, 20, 26, 0.92);
    color: #fff;
    border: 1px solid rgba(54, 214, 181, 0.2);
    border-radius: 6px;
    padding: 4px;
    display: flex;
    gap: 4px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.35);
    backdrop-filter: blur(16px);
    z-index: 2147483647;
    font-family: system-ui, sans-serif;
  }
  button {
    background: transparent;
    border: none;
    color: #d8dee9;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.12s ease;
  }
  button:hover { background: rgba(54, 214, 181, 0.15); color: #36d6b5; }
`;

let currentSessionId = null;
let onEnsureSessionCallback = null;
let hostElement = null;
let shadowRoot = null;
let currentSelectionData = null;

const TAGS = ['Decision', 'Constraint', 'Task', 'Note'];

function buildTooltipDOM() {
  const container = document.createElement('div');
  container.className = 'cc-tooltip';

  TAGS.forEach((tagStr) => {
    const btn = document.createElement('button');
    btn.textContent = tagStr;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('[ContextCopilot] TOOLTIP BUTTON CLICKED:', tagStr);
      
      try {
        let targetSessionId = currentSessionId;
        if (!targetSessionId && onEnsureSessionCallback) {
          targetSessionId = await onEnsureSessionCallback();
          currentSessionId = targetSessionId;
        }

        if (!targetSessionId || !currentSelectionData) {
          console.log('[ContextCopilot] Tooltip save aborted: Missing sessionId or selectionData');
          return;
        }

        const itemData = {
          tag: tagStr.toLowerCase(),
          content: currentSelectionData.text,
          source: 'selection',
          selection_context: {
            selector_hint: currentSelectionData.selectorHint,
          },
        };

        console.log('[ContextCopilot] Tooltip attempting to save:', itemData);

        // Await the item creation so we can catch any limit errors together
        await addItem(targetSessionId, itemData);
        console.log('[ContextCopilot] Tooltip save successful!');
        hideTooltip(); // SPEC-8: Dismiss after save
      } catch (err) {
        console.error('[ContextCopilot] Tooltip save failed:', err);
        hideTooltip(); // Still dismiss tooltip
      }
    });
    container.appendChild(btn);
  });

  return container;
}

function getSelectorHint(node) {
  if (!node) return null;
  if (node.nodeType !== Node.ELEMENT_NODE) {
    node = node.parentElement;
  }
  if (!node) return null;
  if (node.id) return `#${node.id}`;
  if (node.className && typeof node.className === 'string') {
    return `.${node.className.split(' ')[0]}`;
  }
  return node.tagName.toLowerCase();
}

function showTooltip(range, text) {
  if (!hostElement) {
    hostElement = document.createElement('div');
    hostElement.id = 'cc-tooltip-host';
    
    // SPEC-10: Closed Shadow DOM
    shadowRoot = hostElement.attachShadow({ mode: 'closed' });
    
    const style = document.createElement('style');
    style.textContent = TOOLTIP_CSS;
    shadowRoot.appendChild(style);
    
    // Prevent mousedown/mouseup/click inside the entire host from bubbling up to document
    ['click', 'mousedown', 'mouseup', 'keydown', 'keyup'].forEach(evt => {
      hostElement.addEventListener(evt, (e) => e.stopPropagation());
    });
    
    document.body.appendChild(hostElement);
  }

  // Clear existing tooltip
  const existing = shadowRoot.querySelector('.cc-tooltip');
  if (existing) existing.remove();

  const tooltip = buildTooltipDOM();
  
  // Position near selection
  const rect = range.getBoundingClientRect();
  // We need to account for page scroll
  const top = window.scrollY + rect.bottom + 8;
  let left = window.scrollX + rect.left;

  // SPEC-7 constraint: Viewport boundary flipping logic
  if (left + 300 > window.innerWidth + window.scrollX) {
    left = window.innerWidth + window.scrollX - 300;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;

  shadowRoot.appendChild(tooltip);

  currentSelectionData = {
    text,
    selectorHint: getSelectorHint(range.commonAncestorContainer),
  };
}

function hideTooltip() {
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
    shadowRoot = null;
    currentSelectionData = null;
  }
}

// SPEC-7: Capture on mouseup
function handleMouseUp(e) {
  const selection = window.getSelection();
  if (!selection) return hideTooltip();

  const text = selection.toString().trim();
  if (text.length > 0 && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    showTooltip(range, text);
  } else {
    // SPEC-9(c): dismiss on empty selection
    hideTooltip();
  }
}

// SPEC-9(a): dismiss on outside click
function handleMouseDown(e) {
  if (hostElement) {
    hideTooltip();
  }
}

// SPEC-9(b): dismiss on Escape
function handleKeyDown(e) {
  if (e.key === 'Escape' && hostElement) {
    hideTooltip();
  }
}

export function initTooltip(sessionId, onEnsureSession = null) {
  currentSessionId = sessionId;
  onEnsureSessionCallback = onEnsureSession;
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('keydown', handleKeyDown);
}

export function destroyTooltip() {
  hideTooltip();
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('mousedown', handleMouseDown);
  document.removeEventListener('keydown', handleKeyDown);
  currentSessionId = null;
  onEnsureSessionCallback = null;
}
