// src/sidebar/sidebar.js — Sidebar Container
// Implements: SPEC-11 (Sidebar shell, toggle, isolation)

import { setActiveTagFilter } from './item-list.js';

const SIDEBAR_CSS = `
  :host {
    display: block;
    position: fixed;
    top: 0;
    right: 0;
    width: 350px;
    height: 100vh;
    background: #12141a;
    color: #e0e0e0;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.45);
    z-index: 2147483647;
    font-family: system-ui, sans-serif;
    overflow-y: auto;
    animation: cc-slide-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }
  @keyframes cc-slide-in {
    from {
      transform: translateX(100%);
      opacity: 0.85;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  .cc-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    box-sizing: border-box;
  }
  .cc-sidebar-header {
    font-size: 1.2rem;
    font-weight: bold;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #2a2d38;
  }
  .cc-item {
    background: #1c1f27;
    border: 1px solid #2a2d38;
    border-left: 3px solid #36d6b5;
    padding: 10px;
    margin-bottom: 10px;
    border-radius: 6px;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }
  .cc-item:hover {
    background: #22252e;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
  .cc-item-tag {
    font-size: 0.85rem;
    color: #8e95a5;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
  }
  .cc-item-actions button {
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 0.8rem;
    margin-left: 6px;
  }
  .cc-item-actions button:hover {
    color: #fff;
  }
  .cc-item-content {
    font-size: 0.95rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .cc-drag-handle {
    cursor: grab;
    opacity: 0.4;
    user-select: none;
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    letter-spacing: -2px;
    line-height: 1;
    padding: 2px 4px 2px 0;
    transition: opacity 0.15s ease;
  }
  .cc-drag-handle:hover {
    opacity: 0.9;
  }
  .cc-drag-handle:active {
    cursor: grabbing;
  }
  .cc-item.cc-dragging {
    opacity: 0.35;
    transform: scale(0.99);
  }
  .cc-item.cc-drag-over-top {
    border-top: 2px solid #36d6b5 !important;
  }
  .cc-item.cc-drag-over-bottom {
    border-bottom: 2px solid #36d6b5 !important;
  }
  .cc-accordion-section.cc-drag-over {
    outline: 2px dashed #36d6b5;
    outline-offset: -2px;
    border-radius: 4px;
  }
`;

let hostElement = null;
let shadowRoot = null;
let isOpen = false;
const toggleListeners = new Set();

function notifyToggleListeners(openState) {
  toggleListeners.forEach(fn => {
    try {
      fn(openState);
    } catch (err) {
      console.error('[ContextCopilot] Error in toggle listener:', err);
    }
  });
}

/**
 * Injects the sidebar host into the page.
 */
export function injectSidebar() {
  if (hostElement) return;

  hostElement = document.createElement('div');
  hostElement.id = 'cc-sidebar-host';
  
  // SPEC-11: Open Shadow DOM (so internal scripts can query it)
  shadowRoot = hostElement.attachShadow({ mode: 'open' });
  
  // Prevent host page from reacting to extension interactions
  ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress'].forEach(evt => {
    hostElement.addEventListener(evt, (e) => e.stopPropagation());
  });

  const style = document.createElement('style');
  style.textContent = SIDEBAR_CSS;
  shadowRoot.appendChild(style);
  
  const container = document.createElement('div');
  container.className = 'cc-sidebar';
  
  const header = document.createElement('div');
  header.className = 'cc-sidebar-header';
  header.style.display = 'flex';
  header.style.flexDirection = 'column';
  
  const titleRow = document.createElement('div');
  titleRow.style.display = 'flex';
  titleRow.style.alignItems = 'center';
  titleRow.style.marginBottom = '8px';
  
  const title = document.createElement('span');
  title.textContent = 'Context Copilot';
  title.style.fontSize = '1.1rem';
  title.style.fontWeight = '800';
  title.style.letterSpacing = '-0.5px';
  title.style.background = 'linear-gradient(135deg, #eceff4 0%, #36d6b5 100%)';
  title.style.webkitBackgroundClip = 'text';
  title.style.webkitTextFillColor = 'transparent';

  titleRow.appendChild(title);
  
  const copyBtn = document.createElement('button');
  copyBtn.id = 'cc-copy-btn';
  copyBtn.textContent = 'Copy';
  copyBtn.title = 'Copy compiled markdown to clipboard';
  copyBtn.style.marginLeft = 'auto';
  copyBtn.style.padding = '4px 8px';
  copyBtn.style.background = '#1c1f27';
  copyBtn.style.color = '#fff';
  copyBtn.style.border = '1px solid #2a2d38';
  copyBtn.style.borderRadius = '4px';
  copyBtn.style.cursor = 'pointer';
  copyBtn.style.fontSize = '12px';

  const injectBtn = document.createElement('button');
  injectBtn.id = 'cc-inject-btn';
  injectBtn.textContent = 'Inject';
  injectBtn.title = 'Inject compiled context into active prompt';
  injectBtn.style.marginLeft = '6px';
  injectBtn.style.padding = '4px 8px';
  injectBtn.style.background = '#36d6b5';
  injectBtn.style.color = '#12141a';
  injectBtn.style.border = '1px solid #36d6b5';
  injectBtn.style.fontWeight = '600';
  injectBtn.style.borderRadius = '4px';
  injectBtn.style.cursor = 'pointer';
  injectBtn.style.fontSize = '12px';

  const closeBtn = document.createElement('button');
  closeBtn.id = 'cc-close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.title = 'Close Sidebar (Alt+Shift+C)';
  closeBtn.style.marginLeft = '8px';
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = '#999';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '18px';
  closeBtn.style.lineHeight = '1';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.padding = '2px 4px';
  closeBtn.addEventListener('mouseover', () => closeBtn.style.color = '#fff');
  closeBtn.addEventListener('mouseout', () => closeBtn.style.color = '#999');
  
  titleRow.appendChild(title);
  titleRow.appendChild(copyBtn);
  titleRow.appendChild(injectBtn);
  titleRow.appendChild(closeBtn);

  const sessionRow = document.createElement('div');
  sessionRow.style.display = 'flex';
  sessionRow.style.gap = '4px';
  sessionRow.style.alignItems = 'center';
  sessionRow.style.position = 'relative'; // For absolute dropdown menu

  // Custom Dropdown Trigger
  const sessionTrigger = document.createElement('button');
  sessionTrigger.id = 'cc-session-trigger';
  sessionTrigger.style.flexGrow = '1';
  sessionTrigger.style.width = '0'; 
  sessionTrigger.style.display = 'flex';
  sessionTrigger.style.alignItems = 'center';
  sessionTrigger.style.justifyContent = 'space-between';
  sessionTrigger.style.background = '#1c1f27';
  sessionTrigger.style.color = '#fff';
  sessionTrigger.style.border = '1px solid #2a2d38';
  sessionTrigger.style.borderRadius = '4px';
  sessionTrigger.style.padding = '4px 8px';
  sessionTrigger.style.cursor = 'pointer';
  sessionTrigger.style.overflow = 'hidden';
  sessionTrigger.innerHTML = '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:6px;">Loading...</span><span style="font-size:10px;opacity:0.7;flex-shrink:0;">&#9660;</span>';

  // Custom Dropdown Menu
  const sessionMenu = document.createElement('div');
  sessionMenu.id = 'cc-session-menu';
  sessionMenu.style.position = 'absolute';
  sessionMenu.style.top = 'calc(100% + 4px)';
  sessionMenu.style.left = '0';
  sessionMenu.style.right = '0';
  sessionMenu.style.background = '#1c1f27';
  sessionMenu.style.border = '1px solid #2a2d38';
  sessionMenu.style.borderRadius = '4px';
  sessionMenu.style.zIndex = '100';
  sessionMenu.style.display = 'none';
  sessionMenu.style.maxHeight = '200px';
  sessionMenu.style.overflowY = 'auto';
  sessionMenu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  sessionMenu.style.flexDirection = 'column';

  // Common button styling for the mini toolbar
  const btnStyle = 'width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: #2a2d38; color: #fff; border: none; border-radius: 4px; cursor: pointer; padding: 0; font-size: 14px; flex-shrink: 0;';

  const newSessionBtn = document.createElement('button');
  newSessionBtn.id = 'cc-new-session-btn';
  newSessionBtn.innerHTML = '&#43;';
  newSessionBtn.title = 'New Session';
  newSessionBtn.style.cssText = btnStyle;

  const editSessionBtn = document.createElement('button');
  editSessionBtn.id = 'cc-edit-session-btn';
  editSessionBtn.innerHTML = '&#9998;';
  editSessionBtn.title = 'Rename Session';
  editSessionBtn.style.cssText = btnStyle;

  const clearSessionBtn = document.createElement('button');
  clearSessionBtn.id = 'cc-clear-session-btn';
  clearSessionBtn.innerHTML = '&#128465;';
  clearSessionBtn.title = 'Clear all notes in active session';
  clearSessionBtn.style.cssText = btnStyle;
  clearSessionBtn.style.color = '#ff6b6b';

  sessionRow.append(sessionTrigger, sessionMenu, newSessionBtn, editSessionBtn, clearSessionBtn);

  const groupRow = document.createElement('div');
  groupRow.id = 'cc-group-row';
  groupRow.style.display = 'flex';
  groupRow.style.gap = '4px';
  groupRow.style.alignItems = 'center';
  groupRow.style.marginTop = '6px';

  const groupSelect = document.createElement('select');
  groupSelect.id = 'cc-group-select';
  groupSelect.style.flexGrow = '1';
  groupSelect.style.width = '0';
  groupSelect.style.background = '#1c1f27';
  groupSelect.style.color = '#fff';
  groupSelect.style.border = '1px solid #2a2d38';
  groupSelect.style.borderRadius = '4px';
  groupSelect.style.padding = '4px 8px';
  groupSelect.style.cursor = 'pointer';
  groupSelect.style.fontSize = '12px';

  const allGroupsOpt = document.createElement('option');
  allGroupsOpt.value = 'all';
  allGroupsOpt.textContent = 'All Groups';
  groupSelect.appendChild(allGroupsOpt);

  const newGroupBtn = document.createElement('button');
  newGroupBtn.id = 'cc-new-group-btn';
  newGroupBtn.innerHTML = '&#43;';
  newGroupBtn.title = 'New Group';
  newGroupBtn.style.cssText = btnStyle;

  const editGroupBtn = document.createElement('button');
  editGroupBtn.id = 'cc-edit-group-btn';
  editGroupBtn.innerHTML = '&#9998;';
  editGroupBtn.title = 'Rename Group';
  editGroupBtn.style.cssText = btnStyle;

  const deleteGroupBtn = document.createElement('button');
  deleteGroupBtn.id = 'cc-delete-group-btn';
  deleteGroupBtn.innerHTML = '&#128465;';
  deleteGroupBtn.title = 'Delete Group';
  deleteGroupBtn.style.cssText = btnStyle;
  deleteGroupBtn.style.color = '#ff6b6b';

  groupRow.append(groupSelect, newGroupBtn, editGroupBtn, deleteGroupBtn);
  
  header.appendChild(titleRow);
  header.appendChild(sessionRow);
  header.appendChild(groupRow);
  
  header.style.flexShrink = '0';
  container.appendChild(header);
  
  // Filter Input (SPEC-12b)
  const filterInput = document.createElement('input');
  filterInput.id = 'cc-filter-input';
  filterInput.type = 'text';
  filterInput.placeholder = 'Search keyword...';
  filterInput.style.width = '100%';
  filterInput.style.marginBottom = '8px';
  filterInput.style.padding = '6px';
  filterInput.style.boxSizing = 'border-box';
  filterInput.style.background = '#1c1f27';
  filterInput.style.color = '#fff';
  filterInput.style.border = '1px solid #2a2d38';
  filterInput.style.borderRadius = '4px';
  filterInput.style.flexShrink = '0';
  container.appendChild(filterInput);

  // Filter Tabs
  const filterTabs = document.createElement('div');
  filterTabs.id = 'cc-filter-tabs';
  filterTabs.style.display = 'flex';
  filterTabs.style.gap = '6px';
  filterTabs.style.marginBottom = '12px';
  filterTabs.style.overflowX = 'auto';
  filterTabs.style.flexShrink = '0';
  filterTabs.style.minHeight = '32px';
  filterTabs.style.alignItems = 'center';
  filterTabs.style.padding = '2px 0 6px 0';
  filterTabs.style.scrollbarWidth = 'none';

  const TAG_TAB_COLORS = {
    All: '#36d6b5',
    Decision: '#b48ead',
    Constraint: '#bf616a',
    Task: '#a3be8c',
    Note: '#81a1c1'
  };
  
  const tags = ['All', 'Decision', 'Constraint', 'Task', 'Note'];
  tags.forEach(tag => {
    const tab = document.createElement('button');
    tab.textContent = tag;
    tab.dataset.tag = tag;
    tab.style.padding = '4px 10px';
    tab.style.flexShrink = '0';
    const activeColor = TAG_TAB_COLORS[tag] || '#36d6b5';
    tab.style.background = tag === 'All' ? activeColor : '#1c1f27';
    tab.style.color = tag === 'All' ? '#fff' : '#aaa';
    tab.style.border = tag === 'All' ? `1px solid ${activeColor}` : '1px solid #2a2d38';
    tab.style.borderRadius = '12px';
    tab.style.fontSize = '12px';
    tab.style.fontWeight = '600';
    tab.style.cursor = 'pointer';
    tab.style.whiteSpace = 'nowrap';
    tab.style.transition = 'all 0.15s ease';
    
    tab.addEventListener('click', () => {
      // Reset all tab button styles
      Array.from(filterTabs.children).forEach(btn => {
        btn.style.background = '#1c1f27';
        btn.style.borderColor = '#2a2d38';
        btn.style.color = '#aaa';
      });
      // Highlight active
      tab.style.background = activeColor;
      tab.style.borderColor = activeColor;
      tab.style.color = '#fff';
      
      // Set active tag filter in item-list (exact tag match, does not touch search input)
      setActiveTagFilter(tag === 'All' ? 'all' : tag.toLowerCase());

      // Update button titles to reflect scope
      const currentInjectBtn = shadowRoot.getElementById('cc-inject-btn');
      const currentCopyBtn = shadowRoot.getElementById('cc-copy-btn');
      if (currentInjectBtn) {
        currentInjectBtn.title = tag === 'All' ? 'Inject compiled context into active prompt' : `Inject ${tag}s into active prompt`;
      }
      if (currentCopyBtn) {
        currentCopyBtn.title = tag === 'All' ? 'Copy compiled markdown to clipboard' : `Copy ${tag}s to clipboard`;
      }

      // Re-trigger rendering without changing user search text
      filterInput.dispatchEvent(new Event('input'));
    });
    
    filterTabs.appendChild(tab);
  });
  container.appendChild(filterTabs);

  // Item List Container
  const listContainer = document.createElement('div');
  listContainer.id = 'cc-item-list';
  listContainer.style.flex = '1 1 0';
  listContainer.style.minHeight = '0';
  listContainer.style.overflowY = 'auto';
  listContainer.style.marginBottom = '12px';
  container.appendChild(listContainer);

  // Manual Input Form (SPEC-13)
  const manualForm = document.createElement('div');
  manualForm.id = 'cc-manual-form';
  manualForm.style.display = 'flex';
  manualForm.style.flexDirection = 'column';
  manualForm.style.gap = '8px';
  manualForm.style.flexShrink = '0';

  const manualTitle = document.createElement('input');
  manualTitle.id = 'cc-manual-title';
  manualTitle.type = 'text';
  manualTitle.placeholder = 'Title / label (optional)...';
  manualTitle.style.padding = '5px 6px';
  manualTitle.style.background = '#1c1f27';
  manualTitle.style.color = '#fff';
  manualTitle.style.border = '1px solid #2a2d38';
  manualTitle.style.borderRadius = '4px';
  manualTitle.style.fontSize = '0.85rem';
  manualTitle.style.boxSizing = 'border-box';
  
  const manualTextarea = document.createElement('textarea');
  manualTextarea.placeholder = 'Add a manual note...';
  manualTextarea.style.resize = 'vertical';
  manualTextarea.style.padding = '6px';
  
  const manualControls = document.createElement('div');
  manualControls.style.display = 'flex';
  manualControls.style.gap = '8px';
  
  const manualSelect = document.createElement('select');
  ['Decision', 'Constraint', 'Task', 'Note'].forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag.toLowerCase();
    opt.textContent = tag;
    manualSelect.appendChild(opt);
  });

  const manualGroupSelect = document.createElement('select');
  manualGroupSelect.id = 'cc-manual-group-select';
  manualGroupSelect.style.padding = '4px 6px';
  manualGroupSelect.style.background = '#1c1f27';
  manualGroupSelect.style.color = '#fff';
  manualGroupSelect.style.border = '1px solid #2a2d38';
  manualGroupSelect.style.borderRadius = '4px';
  manualGroupSelect.style.fontSize = '0.85rem';
  manualGroupSelect.style.flex = '1';
  manualGroupSelect.style.minWidth = '0';

  const defaultGroupOpt = document.createElement('option');
  defaultGroupOpt.value = '';
  defaultGroupOpt.textContent = 'Ungrouped';
  manualGroupSelect.appendChild(defaultGroupOpt);
  
  const manualSave = document.createElement('button');
  manualSave.textContent = 'Save';
  manualSave.style.padding = '4px 8px';
  
  manualControls.append(manualSelect, manualGroupSelect, manualSave);
  manualForm.append(manualTitle, manualTextarea, manualControls);
  container.appendChild(manualForm);

  // Handle Escape key inside sidebar to dismiss
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      closeSidebar();
    }
  });

  // Prevent host SPA (ChatGPT/Claude) from intercepting keystrokes typed inside the sidebar
  ['keydown', 'keyup', 'keypress', 'mouseup'].forEach(eventType => {
    container.addEventListener(eventType, (e) => e.stopPropagation());
  });

  shadowRoot.appendChild(container);
  
  document.body.appendChild(hostElement);
  isOpen = true;
  notifyToggleListeners(true);
}

/**
 * Opens sidebar if closed.
 */
export function openSidebar() {
  if (!hostElement) {
    injectSidebar();
  } else if (!isOpen) {
    isOpen = true;
    hostElement.style.display = 'block';
    notifyToggleListeners(true);
  }
}

/**
 * Closes sidebar if open.
 */
export function closeSidebar() {
  if (hostElement && isOpen) {
    isOpen = false;
    hostElement.style.display = 'none';
    notifyToggleListeners(false);
  }
}

/**
 * Registers a listener callback invoked whenever sidebar is toggled or opened/closed.
 * @param {Function} callback - (isOpen: boolean) => void
 * @returns {Function} Unsubscribe function
 */
export function onSidebarToggle(callback) {
  if (typeof callback === 'function') {
    toggleListeners.add(callback);
    return () => toggleListeners.delete(callback);
  }
  return () => {};
}

/**
 * Toggles sidebar visibility. Injects if not present.
 */
export function toggleSidebar() {
  if (!hostElement) {
    injectSidebar();
  } else {
    isOpen = !isOpen;
    hostElement.style.display = isOpen ? 'block' : 'none';
    notifyToggleListeners(isOpen);
  }
}

/**
 * Completely removes the sidebar from the DOM.
 */
export function removeSidebar() {
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
    shadowRoot = null;
    isOpen = false;
    notifyToggleListeners(false);
  }
}

/**
 * Checks if the sidebar is currently open.
 * @returns {boolean}
 */
export function isSidebarOpen() {
  return isOpen;
}

/**
 * Exposes internal elements for the entry point to wire up events,
 * maintaining the isolation of the closed Shadow DOM.
 */
export function getSidebarElements() {
  if (!shadowRoot) return null;
  return {
    filterInput: shadowRoot.getElementById('cc-filter-input'),
    filterTabs: shadowRoot.getElementById('cc-filter-tabs'),
    listContainer: shadowRoot.getElementById('cc-item-list'),
    titleInput: shadowRoot.getElementById('cc-manual-title'),
    textarea: shadowRoot.querySelector('#cc-manual-form textarea'),
    select: shadowRoot.querySelector('#cc-manual-form select'),
    manualGroupSelect: shadowRoot.getElementById('cc-manual-group-select'),
    button: shadowRoot.querySelector('#cc-manual-form button'),
    injectBtn: shadowRoot.getElementById('cc-inject-btn'),
    copyBtn: shadowRoot.getElementById('cc-copy-btn'),
    closeBtn: shadowRoot.getElementById('cc-close-btn'),
    sessionTrigger: shadowRoot.getElementById('cc-session-trigger'),
    sessionMenu: shadowRoot.getElementById('cc-session-menu'),
    newSessionBtn: shadowRoot.getElementById('cc-new-session-btn'),
    editSessionBtn: shadowRoot.getElementById('cc-edit-session-btn'),
    clearSessionBtn: shadowRoot.getElementById('cc-clear-session-btn'),
    groupRow: shadowRoot.getElementById('cc-group-row'),
    groupSelect: shadowRoot.getElementById('cc-group-select'),
    newGroupBtn: shadowRoot.getElementById('cc-new-group-btn'),
    editGroupBtn: shadowRoot.getElementById('cc-edit-group-btn'),
    deleteGroupBtn: shadowRoot.getElementById('cc-delete-group-btn'),
    proBadge: shadowRoot.getElementById('cc-pro-badge'),
    container: shadowRoot.querySelector('.cc-sidebar')
  };
}
