// src/sidebar/edge-handle.js — Floating Edge Pull-Handle ("Peek Tab")
// Implements: Edge Handle, live item counter badge, vertical drag, pulse feedback

const HANDLE_CSS = `
  :host {
    display: block;
    position: fixed;
    right: 0;
    top: 45%;
    z-index: 2147483646;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    transition: right 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.15s ease;
  }

  :host(.cc-sidebar-open) {
    right: 350px;
  }

  .cc-edge-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 32px;
    min-height: 52px;
    background: rgba(18, 20, 26, 0.85);
    color: #e0e0e0;
    border: 1px solid rgba(54, 214, 181, 0.2);
    border-right: none;
    border-radius: 8px 0 0 8px;
    cursor: pointer;
    box-shadow: -3px 2px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    padding: 6px 2px;
    box-sizing: border-box;
    transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .cc-edge-tab:hover {
    background: rgba(28, 31, 39, 0.9);
    border-color: #36d6b5;
    box-shadow: -4px 2px 18px rgba(54, 214, 181, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  :host(:not(.cc-sidebar-open)) .cc-edge-tab:hover {
    transform: translateX(-3px);
  }

  .cc-edge-icon {
    font-size: 13px;
    line-height: 1;
    color: #36d6b5;
    margin-bottom: 4px;
    transition: transform 0.2s ease;
  }

  .cc-edge-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    color: #12141a;
    background: #36d6b5;
    border-radius: 8px;
    box-sizing: border-box;
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  .cc-edge-badge.cc-hidden {
    display: none;
  }

  /* Pulse animation on capture */
  @keyframes cc-edge-pulse {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(1.4);
      background-color: #36d6b5;
      box-shadow: 0 0 10px rgba(54, 214, 181, 0.6);
    }
    100% {
      transform: scale(1);
    }
  }

  .cc-edge-badge.cc-pulse {
    animation: cc-edge-pulse 0.5s ease-out;
  }
`;

let hostElement = null;
let shadowRoot = null;
let toggleCallback = null;
let currentItemCount = 0;
let isDragging = false;
let startY = 0;
let startTopPx = 0;
let hasDragged = false;

const DRAG_THRESHOLD = 5; // px

/**
 * Initializes and injects the floating edge handle into the DOM.
 * @param {Object} options
 * @param {Function} options.onToggle - Callback when handle is clicked
 * @param {number} [options.initialCount=0] - Starting item count
 * @returns {HTMLElement} The host element
 */
export function initEdgeHandle({ onToggle, initialCount = 0 } = {}) {
  if (hostElement) {
    updateEdgeHandleCount(initialCount);
    return hostElement;
  }

  toggleCallback = onToggle || null;
  currentItemCount = initialCount;

  hostElement = document.createElement('div');
  hostElement.id = 'cc-edge-handle-host';

  // Closed Shadow DOM for isolation
  shadowRoot = hostElement.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = HANDLE_CSS;
  shadowRoot.appendChild(style);

  const tab = document.createElement('div');
  tab.className = 'cc-edge-tab';
  tab.setAttribute('role', 'button');
  tab.setAttribute('aria-label', 'Toggle Context Copilot');
  tab.title = 'Context Copilot (Click to toggle, Drag to move)';

  const icon = document.createElement('span');
  icon.className = 'cc-edge-icon';
  icon.textContent = '‹';

  const badge = document.createElement('span');
  badge.className = 'cc-edge-badge' + (initialCount > 0 ? '' : ' cc-hidden');
  badge.textContent = initialCount > 99 ? '99+' : String(initialCount);

  tab.appendChild(icon);
  tab.appendChild(badge);
  shadowRoot.appendChild(tab);

  // Restore saved vertical position
  restoreSavedPosition(hostElement);

  // Bind mouse / drag events
  bindDragEvents(tab, hostElement);

  document.body.appendChild(hostElement);
  return hostElement;
}

/**
 * Restores saved position from chrome.storage.local.
 */
function restoreSavedPosition(host) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local && chrome.runtime?.id) {
      chrome.storage.local.get(['cc_edge_handle_top_pct'], (res) => {
        if (chrome.runtime?.lastError) return;
        if (res && typeof res.cc_edge_handle_top_pct === 'number') {
          host.style.top = `${res.cc_edge_handle_top_pct}%`;
        }
      });
    }
  } catch (err) {
    // Ignore context invalidation or environment without storage
  }
}

/**
 * Saves current vertical position percentage to chrome.storage.local.
 */
function persistPosition(topPct) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local && chrome.runtime?.id) {
      chrome.storage.local.set({ cc_edge_handle_top_pct: topPct });
    }
  } catch (err) {
    // Ignore context invalidation
  }
}

/**
 * Binds dragging and click handling with movement threshold.
 */
function bindDragEvents(tab, host) {
  tab.addEventListener('mousedown', (e) => {
    // Only track left click
    if (e.button !== 0) return;
    
    isDragging = true;
    hasDragged = false;
    startY = e.clientY;
    startTopPx = host.getBoundingClientRect().top;

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      const deltaY = moveEvent.clientY - startY;

      if (!hasDragged && Math.abs(deltaY) > DRAG_THRESHOLD) {
        hasDragged = true;
      }

      if (hasDragged) {
        moveEvent.preventDefault();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 600;
        const newTop = Math.max(30, Math.min(viewportHeight - 70, startTopPx + deltaY));
        const topPct = (newTop / viewportHeight) * 100;
        host.style.top = `${topPct.toFixed(1)}%`;
      }
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (hasDragged) {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 600;
        const currentTop = host.getBoundingClientRect().top;
        const topPct = parseFloat(((currentTop / viewportHeight) * 100).toFixed(1));
        persistPosition(topPct);
      } else {
        // Pure click: trigger toggle
        if (toggleCallback) {
          toggleCallback();
        }
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * Updates the item counter badge and optionally triggers the pulse animation.
 * @param {number} count - Total items in current session
 * @param {Object} [options]
 * @param {boolean} [options.pulse=false] - Whether to trigger pulse animation
 */
export function updateEdgeHandleCount(count, { pulse = false } = {}) {
  currentItemCount = typeof count === 'number' && !isNaN(count) ? Math.max(0, count) : 0;
  if (!shadowRoot) return;

  const badge = shadowRoot.querySelector('.cc-edge-badge');
  if (!badge) return;

  if (currentItemCount > 0) {
    badge.textContent = currentItemCount > 99 ? '99+' : String(currentItemCount);
    badge.classList.remove('cc-hidden');
  } else {
    badge.textContent = '0';
    badge.classList.add('cc-hidden');
  }

  if (pulse) {
    triggerPulse();
  }
}

/**
 * Triggers a visual pulse animation on the badge.
 */
export function triggerPulse() {
  if (!shadowRoot) return;
  const badge = shadowRoot.querySelector('.cc-edge-badge');
  if (!badge) return;

  badge.classList.remove('cc-pulse');
  // Trigger reflow to restart animation if in browser
  if (typeof badge.offsetWidth !== 'undefined') {
    void badge.offsetWidth;
  }
  badge.classList.add('cc-pulse');

  setTimeout(() => {
    if (shadowRoot) {
      const b = shadowRoot.querySelector('.cc-edge-badge');
      if (b) b.classList.remove('cc-pulse');
    }
  }, 500);
}

/**
 * Synchronizes the handle's visual state with the sidebar open/closed state.
 * @param {boolean} isOpen
 */
export function setEdgeHandleOpen(isOpen) {
  if (!hostElement || !shadowRoot) return;

  const icon = shadowRoot.querySelector('.cc-edge-icon');
  if (isOpen) {
    hostElement.classList.add('cc-sidebar-open');
    if (icon) icon.textContent = '›';
  } else {
    hostElement.classList.remove('cc-sidebar-open');
    if (icon) icon.textContent = '‹';
  }
}

/**
 * Removes the edge handle from the DOM and cleans up.
 */
export function destroyEdgeHandle() {
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
    shadowRoot = null;
    toggleCallback = null;
    currentItemCount = 0;
  }
}

/**
 * Exposes internal shadow DOM for testing purposes.
 * @returns {ShadowRoot|null}
 */
export function getEdgeHandleShadowRoot() {
  return shadowRoot;
}
