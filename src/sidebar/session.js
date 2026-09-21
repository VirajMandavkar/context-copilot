import { getSessionIndex, linkThreadToSession, renameSession, createAndLinkSessionForThread, deleteSession } from '../storage/engine.js';
import { canCreateSession } from '../license/guard.js';
import { openProModal } from './pro-modal.js';

export async function setupSessionUI(threadId, elements, currentSessionId, onSessionChanged) {
  const { sessionTrigger, sessionMenu, newSessionBtn, editSessionBtn } = elements;
  
  let isMenuOpen = false;
  let activeId = currentSessionId;

  function toggleMenu(force) {
    if (force !== undefined) isMenuOpen = force;
    else isMenuOpen = !isMenuOpen;
    sessionMenu.style.display = isMenuOpen ? 'flex' : 'none';
  }

  sessionTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    toggleMenu();
  });

  // Populate custom dropdown
  async function renderDropdown(activeSessionId) {
    activeId = activeSessionId;
    const index = await getSessionIndex();
    sessionMenu.innerHTML = '';
    
    const sessions = Object.entries(index.sessions || {}).sort((a, b) => {
      return new Date(b[1].updated_at).getTime() - new Date(a[1].updated_at).getTime();
    });

    const activeMeta = activeId ? index.sessions[activeId] : null;
    const triggerLabel = activeMeta ? `${activeMeta.name} (${activeMeta.origin_ai})` : 'Select or + New Session';
    sessionTrigger.innerHTML = '';
    const labelSpan = document.createElement('span');
    labelSpan.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:6px;';
    labelSpan.textContent = triggerLabel;
    const arrowSpan = document.createElement('span');
    arrowSpan.style.cssText = 'font-size:10px;opacity:0.7;flex-shrink:0;';
    arrowSpan.innerHTML = '&#9660;';
    sessionTrigger.append(labelSpan, arrowSpan);

    sessions.forEach(([sid, meta]) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.padding = '8px';
      row.style.borderBottom = '1px solid #444';
      row.style.cursor = 'pointer';
      if (sid === activeId) row.style.background = '#444';
      
      row.addEventListener('mouseover', () => { if (sid !== activeId) row.style.background = '#3a3a3a'; });
      row.addEventListener('mouseout', () => { if (sid !== activeId) row.style.background = 'transparent'; });

      const label = document.createElement('span');
      label.textContent = `${meta.name} (${meta.origin_ai})`;
      label.style.flexGrow = '1';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.whiteSpace = 'nowrap';

      const delBtn = document.createElement('button');
      delBtn.innerHTML = '&#128465;'; // Trash icon
      delBtn.title = 'Delete Session';
      delBtn.style.background = 'transparent';
      delBtn.style.border = 'none';
      delBtn.style.color = '#ff6b6b';
      delBtn.style.cursor = 'pointer';
      delBtn.style.fontSize = '14px';
      delBtn.style.padding = '2px 4px';

      // Switch session on row click
      row.addEventListener('click', async (e) => {
        if (sid === activeId) {
          toggleMenu(false);
          return;
        }
        toggleMenu(false);
        if (threadId) {
          await linkThreadToSession(threadId, sid);
        }
        onSessionChanged(sid);
      });

      // Delete session on trash click
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // prevent row click
        
        // Custom verification
        const word = prompt(`Type "delete" to confirm deleting session "${meta.name}":`);
        if (word && word.toLowerCase().trim() === 'delete') {
          const deleted = await deleteSession(sid);
          if (!deleted) return;
          
          if (sid === activeId) {
            // Deleted currently active, switch to remaining or null
            const newIndex = await getSessionIndex();
            const remaining = Object.keys(newIndex.sessions || {});
            if (remaining.length > 0) {
              const nextSessionId = remaining[0];
              if (threadId) await linkThreadToSession(threadId, nextSessionId);
              onSessionChanged(nextSessionId);
            } else {
              onSessionChanged(null);
              await renderDropdown(null);
            }
          } else {
            // Just re-render the dropdown
            await renderDropdown(activeId);
          }
        }
      });

      row.append(label, delBtn);
      sessionMenu.appendChild(row);
    });

    // Quick "+ New Session" option inside the dropdown menu
    const newSessionRow = document.createElement('div');
    newSessionRow.style.display = 'flex';
    newSessionRow.style.alignItems = 'center';
    newSessionRow.style.padding = '8px';
    newSessionRow.style.borderTop = '1px solid #444';
    newSessionRow.style.color = '#88c0d0';
    newSessionRow.style.cursor = 'pointer';
    newSessionRow.style.fontSize = '13px';
    newSessionRow.innerHTML = '<span style="font-weight:bold;margin-right:8px;font-size:16px;">+</span> New Session';
    
    newSessionRow.addEventListener('mouseover', () => { newSessionRow.style.background = '#333'; });
    newSessionRow.addEventListener('mouseout', () => { newSessionRow.style.background = 'transparent'; });
    newSessionRow.addEventListener('click', async (e) => {
      e.preventDefault();
      toggleMenu(false);

      const curIndex = await getSessionIndex();
      const sessionCount = Object.keys(curIndex.sessions || {}).length;
      const guard = await canCreateSession(sessionCount);
      if (!guard.allowed) {
        const container = sessionTrigger.closest('.cc-sidebar') || document.body;
        openProModal(container, guard.reason);
        return;
      }

      const { sessionId } = await createAndLinkSessionForThread(threadId, window.location.href);
      onSessionChanged(sessionId);
    });
    sessionMenu.appendChild(newSessionRow);
  }

  await renderDropdown(currentSessionId);

  // Create new session
  newSessionBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    toggleMenu(false);

    const curIndex = await getSessionIndex();
    const sessionCount = Object.keys(curIndex.sessions || {}).length;
    const guard = await canCreateSession(sessionCount);
    if (!guard.allowed) {
      const container = sessionTrigger.closest('.cc-sidebar') || document.body;
      openProModal(container, guard.reason);
      return;
    }

    const { sessionId } = await createAndLinkSessionForThread(threadId, window.location.href);
    onSessionChanged(sessionId);
  });

  // Rename session
  editSessionBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    toggleMenu(false);
    if (!activeId) return;
    
    const index = await getSessionIndex();
    const meta = index.sessions[activeId];
    const defaultName = meta?.name || 'New Session';
    const newName = prompt('Rename Session:', defaultName);
    
    if (newName !== null && newName.trim() !== '') {
      await renameSession(activeId, newName);
      await renderDropdown(activeId);
    }
  });

  // Close menu when clicking outside (Bug 1 Fix: Attach to shadowRoot via root node)
  const rootNode = sessionTrigger.getRootNode();
  if (rootNode._ccSessionClick) {
    rootNode.removeEventListener('click', rootNode._ccSessionClick);
  }
  rootNode._ccSessionClick = (e) => {
    if (!sessionTrigger.contains(e.target) && !sessionMenu.contains(e.target)) {
      toggleMenu(false);
    }
  };
  rootNode.addEventListener('click', rootNode._ccSessionClick);

  if (document._ccSessionClick) {
    document.removeEventListener('click', document._ccSessionClick);
  }
  document._ccSessionClick = (e) => {
    if (e.target && e.target.id === 'cc-sidebar-host') return;
    toggleMenu(false);
  };
  document.addEventListener('click', document._ccSessionClick);
}
