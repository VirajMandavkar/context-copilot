// content.js — Context Copilot Entry Point
// Implements: SPEC-5, SPEC-6, SPEC-11, T-20 (Wiring)

import { startNavigationTracker } from './src/storage/navigation.js';
import { getSessionForThread, createAndLinkSessionForThread, getSessionState, clearSessionItems, createGroup, renameGroup, deleteGroup } from './src/storage/engine.js';
import { startStorageReactivity, stopStorageReactivity } from './src/storage/reactivity.js';
import { initTooltip, destroyTooltip } from './src/tooltip/tooltip.js';
import { toggleSidebar, closeSidebar, isSidebarOpen, getSidebarElements, onSidebarToggle } from './src/sidebar/sidebar.js';
import { initEdgeHandle, updateEdgeHandleCount, setEdgeHandleOpen } from './src/sidebar/edge-handle.js';
import { setupFilterUI } from './src/sidebar/filter.js';
import { setupManualInputUI } from './src/sidebar/manual-input.js';
import { renderItemList, getActiveTagFilter, getActiveGroupFilter, setActiveGroupFilter } from './src/sidebar/item-list.js';
import { setupSessionUI } from './src/sidebar/session.js';

import { compileContext } from './src/injector/compiler.js';
import { findInputElement } from './src/injector/detector.js';
import { injectTextarea } from './src/injector/textarea.js';
import { injectContentEditable } from './src/injector/contenteditable.js';
import { canUseGrouping } from './src/license/guard.js';
import { openProModal } from './src/sidebar/pro-modal.js';

let currentThreadId = null;
let currentSessionId = null;
let currentSessionState = null;
let lastKnownItemCount = 0;

function updateActionTooltips() {
  const elements = getSidebarElements();
  if (!elements) return;

  const tag = getActiveTagFilter();
  const group = getActiveGroupFilter();

  let scopeDesc = '';
  if (tag !== 'all' && group !== 'all') {
    scopeDesc = `${tag}s in ${group}`;
  } else if (tag !== 'all') {
    scopeDesc = `${tag}s`;
  } else if (group !== 'all') {
    scopeDesc = `${group}`;
  }

  if (elements.injectBtn) {
    elements.injectBtn.title = scopeDesc
      ? `Inject ${scopeDesc} into active prompt`
      : 'Inject compiled context into active prompt';
  }
  if (elements.copyBtn) {
    elements.copyBtn.title = scopeDesc
      ? `Copy ${scopeDesc} to clipboard`
      : 'Copy compiled markdown to clipboard';
  }
}

function populateGroupDropdowns() {
  const elements = getSidebarElements();
  if (!elements || !elements.groupSelect) return;

  const groupSelect = elements.groupSelect;
  const manualGroupSelect = elements.manualGroupSelect;
  const newGroupBtn = elements.newGroupBtn;
  const editGroupBtn = elements.editGroupBtn;
  const deleteGroupBtn = elements.deleteGroupBtn;

  const hasSession = Boolean(currentSessionId);
  const groups = currentSessionState?.groups || [];
  const activeGroup = getActiveGroupFilter();

  // Populate groupSelect options
  groupSelect.innerHTML = '';

  const allOpt = document.createElement('option');
  allOpt.value = 'all';
  allOpt.textContent = 'All Groups';
  groupSelect.appendChild(allOpt);

  const ungroupedOpt = document.createElement('option');
  ungroupedOpt.value = 'ungrouped';
  ungroupedOpt.textContent = 'Ungrouped';
  groupSelect.appendChild(ungroupedOpt);

  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    groupSelect.appendChild(opt);
  });

  // Preserve active group selection if still valid
  const validValues = ['all', 'ungrouped', ...groups];
  const matchedValue = validValues.find(v => v.toLowerCase() === activeGroup.toLowerCase());
  if (matchedValue) {
    groupSelect.value = matchedValue;
  } else {
    groupSelect.value = 'all';
    setActiveGroupFilter('all');
  }

  // Populate manualGroupSelect options
  if (manualGroupSelect) {
    manualGroupSelect.innerHTML = '';
    const defaultManualOpt = document.createElement('option');
    defaultManualOpt.value = '';
    defaultManualOpt.textContent = 'Ungrouped';
    manualGroupSelect.appendChild(defaultManualOpt);

    groups.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      manualGroupSelect.appendChild(opt);
    });

    const curGroup = getActiveGroupFilter();
    if (curGroup !== 'all' && curGroup.toLowerCase() !== 'ungrouped' && groups.some(g => g.toLowerCase() === curGroup.toLowerCase())) {
      manualGroupSelect.value = groups.find(g => g.toLowerCase() === curGroup.toLowerCase());
    } else {
      manualGroupSelect.value = '';
    }
  }

  // Update button states
  if (groupSelect) {
    groupSelect.disabled = !hasSession;
    groupSelect.style.opacity = hasSession ? '1' : '0.4';
    groupSelect.style.cursor = hasSession ? 'pointer' : 'not-allowed';
  }
  if (newGroupBtn) {
    newGroupBtn.disabled = !hasSession;
    newGroupBtn.style.opacity = hasSession ? '1' : '0.4';
    newGroupBtn.style.cursor = hasSession ? 'pointer' : 'not-allowed';
  }

  const isCustomGroup = hasSession && groupSelect.value !== 'all' && groupSelect.value !== 'ungrouped';
  if (editGroupBtn) {
    editGroupBtn.disabled = !isCustomGroup;
    editGroupBtn.style.opacity = isCustomGroup ? '1' : '0.4';
    editGroupBtn.style.cursor = isCustomGroup ? 'pointer' : 'not-allowed';
  }
  if (deleteGroupBtn) {
    deleteGroupBtn.disabled = !isCustomGroup;
    deleteGroupBtn.style.opacity = isCustomGroup ? '1' : '0.4';
    deleteGroupBtn.style.cursor = isCustomGroup ? 'pointer' : 'not-allowed';
  }

  updateActionTooltips();
}

function syncEdgeHandleState(state, { allowPulse = false } = {}) {
  const newCount = state?.items?.length || 0;
  const shouldPulse = allowPulse && newCount > lastKnownItemCount;
  lastKnownItemCount = newCount;
  updateEdgeHandleCount(newCount, { pulse: shouldPulse });
}

async function ensureSession() {
  if (!currentSessionId) {
    const thread = currentThreadId || ('thread-' + Date.now().toString(36));
    const initData = await createAndLinkSessionForThread(thread, window.location.href);
    currentSessionId = initData.sessionId;
    currentSessionState = initData.state;
    syncEdgeHandleState(currentSessionState, { allowPulse: true });

    startStorageReactivity(currentSessionId, (newState) => {
      currentSessionState = newState;
      syncEdgeHandleState(newState, { allowPulse: true });
      populateGroupDropdowns();
      renderSidebarList();
    });

    wireSidebar(currentThreadId, currentSessionId);
  }
  return currentSessionId;
}

// Initialize the extension in the current context
async function boot() {
  // Initialize floating edge pull-handle
  initEdgeHandle({
    onToggle: () => {
      toggleSidebar();
      wireSidebar(currentThreadId, currentSessionId);
    },
    initialCount: currentSessionState?.items?.length || 0
  });

  // Keep edge handle open/closed sync in step with sidebar
  onSidebarToggle((isOpen) => {
    setEdgeHandleOpen(isOpen);
  });

  // Global Escape key listener to close sidebar when open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSidebarOpen()) {
      e.preventDefault();
      closeSidebar();
    }
  });

  await startNavigationTracker(async (threadId) => {
    // Teardown previous thread specific UI/listeners if any
    destroyTooltip();
    stopStorageReactivity();
    
    currentThreadId = threadId;
    
    // Check if this thread already has an active session (do NOT auto-create!)
    const sessionData = await getSessionForThread(threadId);
    currentSessionId = sessionData.sessionId;
    currentSessionState = sessionData.state;
    syncEdgeHandleState(currentSessionState, { allowPulse: false });

    // Bootstrap DOM modules
    initTooltip(currentSessionId, ensureSession);

    // Setup cross-context reactivity if session exists
    if (currentSessionId) {
      startStorageReactivity(currentSessionId, (newState) => {
        currentSessionState = newState;
        syncEdgeHandleState(newState, { allowPulse: true });
        renderSidebarList();
      });
    }

    wireSidebar(currentThreadId, currentSessionId);
  });

  // Listen for sidebar toggle commands from background worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'CC_TOGGLE_SIDEBAR') {
      toggleSidebar();
      wireSidebar(currentThreadId, currentSessionId);
    }
  });
}

// Ensure the sidebar UI components are bound to the current state
function wireSidebar(threadId, sessionId) {
  const elements = getSidebarElements();
  if (!elements) return;

  // Close Button
  if (elements.closeBtn) {
    const newCloseBtn = elements.closeBtn.cloneNode(true);
    elements.closeBtn.parentNode.replaceChild(newCloseBtn, elements.closeBtn);
    newCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSidebar();
    });
  }  // Copy Context Button
  if (elements.copyBtn) {
    const newCopyBtn = elements.copyBtn.cloneNode(true);
    elements.copyBtn.parentNode.replaceChild(newCopyBtn, elements.copyBtn);
    newCopyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentSessionState) return;

      const tagFilter = getActiveTagFilter();
      const groupFilter = getActiveGroupFilter();
      const markdown = compileContext(currentSessionState, { tag: tagFilter, group: groupFilter });
      if (!markdown) return;

      try {
        await navigator.clipboard.writeText(markdown);
        const originalText = newCopyBtn.textContent;
        newCopyBtn.textContent = '✓ Copied!';
        newCopyBtn.style.color = '#a3be8c';
        setTimeout(() => {
          newCopyBtn.textContent = originalText;
          newCopyBtn.style.color = '#fff';
        }, 1500);
      } catch (err) {
        console.error('Context Copilot: Failed to copy to clipboard', err);
      }
    });
  }

  // Bind Group Selector & Controls
  if (elements.groupSelect) {
    const newGroupSelect = elements.groupSelect.cloneNode(true);
    elements.groupSelect.parentNode.replaceChild(newGroupSelect, elements.groupSelect);
    newGroupSelect.addEventListener('change', () => {
      setActiveGroupFilter(newGroupSelect.value);
      populateGroupDropdowns();
      renderSidebarList();
    });
  }

  if (elements.newGroupBtn) {
    const newBtn = elements.newGroupBtn.cloneNode(true);
    elements.newGroupBtn.parentNode.replaceChild(newBtn, elements.newGroupBtn);
    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentSessionId) return;

      const guard = await canUseGrouping();
      if (!guard.allowed) {
        if (elements.container) {
          openProModal(elements.container, guard.reason);
        }
        return;
      }

      const name = prompt('Enter new group name (e.g. Frontend UI, Go Proxy, Auth):');
      if (!name || !name.trim()) return;

      try {
        await createGroup(currentSessionId, name.trim());
        currentSessionState = await getSessionState(currentSessionId);
        setActiveGroupFilter(name.trim());
        populateGroupDropdowns();
        renderSidebarList();
      } catch (err) {
        alert(err.message || 'Failed to create group');
      }
    });
  }

  if (elements.editGroupBtn) {
    const newEditBtn = elements.editGroupBtn.cloneNode(true);
    elements.editGroupBtn.parentNode.replaceChild(newEditBtn, elements.editGroupBtn);
    newEditBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentSessionId) return;

      const currentGroup = getActiveGroupFilter();
      if (!currentGroup || currentGroup === 'all' || currentGroup === 'ungrouped') return;

      const newName = prompt('Enter new name for group:', currentGroup);
      if (!newName || !newName.trim() || newName.trim().toLowerCase() === currentGroup.toLowerCase()) return;

      try {
        await renameGroup(currentSessionId, currentGroup, newName.trim());
        currentSessionState = await getSessionState(currentSessionId);
        setActiveGroupFilter(newName.trim());
        populateGroupDropdowns();
        renderSidebarList();
      } catch (err) {
        alert(err.message || 'Failed to rename group');
      }
    });
  }

  if (elements.deleteGroupBtn) {
    const newDelBtn = elements.deleteGroupBtn.cloneNode(true);
    elements.deleteGroupBtn.parentNode.replaceChild(newDelBtn, elements.deleteGroupBtn);
    newDelBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentSessionId) return;

      const currentGroup = getActiveGroupFilter();
      if (!currentGroup || currentGroup === 'all' || currentGroup === 'ungrouped') return;

      const confirmed = confirm(`Delete group "${currentGroup}"?\n\nItems in this group will become ungrouped.`);
      if (!confirmed) return;

      try {
        await deleteGroup(currentSessionId, currentGroup, { deleteItems: false });
        currentSessionState = await getSessionState(currentSessionId);
        setActiveGroupFilter('all');
        populateGroupDropdowns();
        renderSidebarList();
      } catch (err) {
        alert(err.message || 'Failed to delete group');
      }
    });
  }
  
  // Bind Session Selector (T-21)
  if (elements.sessionTrigger && elements.sessionMenu) {
    // Only bind once using clone to drop old event listeners
    const newTrigger = elements.sessionTrigger.cloneNode(true);
    elements.sessionTrigger.parentNode.replaceChild(newTrigger, elements.sessionTrigger);
    
    const newMenu = elements.sessionMenu.cloneNode(true);
    elements.sessionMenu.parentNode.replaceChild(newMenu, elements.sessionMenu);
    
    const newNewBtn = elements.newSessionBtn.cloneNode(true);
    elements.newSessionBtn.parentNode.replaceChild(newNewBtn, elements.newSessionBtn);
    
    const newEditBtn = elements.editSessionBtn.cloneNode(true);
    newEditBtn.disabled = !sessionId;
    newEditBtn.style.opacity = sessionId ? '1' : '0.4';
    newEditBtn.style.cursor = sessionId ? 'pointer' : 'not-allowed';
    elements.editSessionBtn.parentNode.replaceChild(newEditBtn, elements.editSessionBtn);

    const sessionElements = { 
      sessionTrigger: newTrigger, 
      sessionMenu: newMenu, 
      newSessionBtn: newNewBtn, 
      editSessionBtn: newEditBtn
    };
    
    setupSessionUI(threadId, sessionElements, sessionId, async (newSessionId) => {
      // Re-initialize for new session
      currentSessionId = newSessionId;
      currentSessionState = newSessionId ? await getSessionState(newSessionId) : null;
      syncEdgeHandleState(currentSessionState, { allowPulse: false });
      setActiveGroupFilter('all');
      
      destroyTooltip();
      initTooltip(newSessionId, ensureSession);
      
      stopStorageReactivity();
      if (newSessionId) {
        startStorageReactivity(newSessionId, (newState) => {
          currentSessionState = newState;
          syncEdgeHandleState(newState, { allowPulse: true });
          populateGroupDropdowns();
          renderSidebarList();
        });
      }
      
      wireSidebar(threadId, newSessionId); // Rewire everything for the new session
    });
  }

  // Clear Session Notes Button
  if (elements.clearSessionBtn) {
    const newClearBtn = elements.clearSessionBtn.cloneNode(true);
    newClearBtn.disabled = !sessionId;
    newClearBtn.style.opacity = sessionId ? '1' : '0.4';
    newClearBtn.style.cursor = sessionId ? 'pointer' : 'not-allowed';
    elements.clearSessionBtn.parentNode.replaceChild(newClearBtn, elements.clearSessionBtn);
    newClearBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentSessionId) return;

      const confirmed = confirm('Clear all notes in the active session?');
      if (confirmed) {
        await clearSessionItems(currentSessionId);
        currentSessionState = await getSessionState(currentSessionId);
        syncEdgeHandleState(currentSessionState, { allowPulse: false });
        populateGroupDropdowns();
        renderSidebarList();
      }
    });
  }

  // Bind Filter
  if (elements.filterInput) {
    setupFilterUI(elements.filterInput, renderSidebarList);
  }

  // Bind Manual Input
  if (elements.textarea && elements.select && elements.button) {
    const newBtn = elements.button.cloneNode(true);
    elements.button.parentNode.replaceChild(newBtn, elements.button);
    setupManualInputUI(sessionId, {
      titleInput: elements.titleInput,
      textarea: elements.textarea,
      select: elements.select,
      groupSelect: elements.manualGroupSelect,
      button: newBtn
    }, ensureSession);
  }

  // Bind Inject Button (T-20)
  if (elements.injectBtn) {
    const newInjectBtn = elements.injectBtn.cloneNode(true);
    elements.injectBtn.parentNode.replaceChild(newInjectBtn, elements.injectBtn);
    newInjectBtn.addEventListener('click', async () => {
      if (!currentSessionState) return;

      const tagFilter = getActiveTagFilter();
      const groupFilter = getActiveGroupFilter();
      const markdown = compileContext(currentSessionState, { tag: tagFilter, group: groupFilter });
      if (!markdown) return;

      const inputEl = findInputElement();
      if (!inputEl) {
        console.log('Context Copilot: No suitable input element found.');
        return;
      }

      if (inputEl.tagName === 'TEXTAREA') {
        await injectTextarea(inputEl, markdown);
      } else {
        await injectContentEditable(inputEl, markdown);
      }

      const originalText = newInjectBtn.textContent;
      newInjectBtn.textContent = '✓ Injected!';
      newInjectBtn.style.background = '#2e7d32';
      setTimeout(() => {
        newInjectBtn.textContent = originalText;
        newInjectBtn.style.background = '#007acc';
      }, 1500);
    });
  }

  populateGroupDropdowns();

  // Initial render
  renderSidebarList();
}

// Helper to invoke rendering with current state
function renderSidebarList() {
  const elements = getSidebarElements();
  if (elements && elements.listContainer) {
    renderItemList(elements.listContainer, currentSessionState);
  }
}

// Start immediately
boot().catch((err) => {
  if (err?.message?.includes('Extension context invalidated')) return;
  console.log('[ContextCopilot] Boot error:', err);
});
