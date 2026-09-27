// src/sidebar/item-list.js — Item List Rendering & Reactivity
// Implements: SPEC-12 (rendering), SPEC-12b (filtering), card expansion, optional titles, user-named grouping, drag-and-drop

import { editItem, deleteItem, toggleTaskCompletion, reorderItem } from '../storage/engine.js';

let currentFilter = '';
let activeTagFilter = 'all';
let activeGroupFilter = 'all';
const collapsedGroups = new Set();

const TAG_COLORS = {
  decision: '#b48ead',
  constraint: '#bf616a',
  task: '#a3be8c',
  note: '#81a1c1'
};

/**
 * Set the keyword filter text for the sidebar items.
 * @param {string} text 
 */
export function setFilterText(text) {
  currentFilter = (text || '').toLowerCase().trim();
}

/**
 * Set the active tag filter pill ('all' or specific tag).
 * @param {string} tag 
 */
export function setActiveTagFilter(tag) {
  activeTagFilter = (tag || 'all').toLowerCase().trim();
}

/**
 * Get the current active tag filter.
 * @returns {string}
 */
export function getActiveTagFilter() {
  return activeTagFilter;
}

/**
 * Set the active group filter ('all' or specific group name).
 * @param {string} group 
 */
export function setActiveGroupFilter(group) {
  activeGroupFilter = (group || 'all').trim();
}

/**
 * Get the current active group filter.
 * @returns {string}
 */
export function getActiveGroupFilter() {
  return activeGroupFilter;
}

/**
 * Renders the items from ThreadState into the provided container.
 * SPEC-12b: Applies current keyword filter, active tag filter, and group filter before rendering.
 *
 * @param {HTMLElement} container 
 * @param {object|null} sessionState 
 */
export function renderItemList(container, sessionState) {
  console.log('[ContextCopilot] renderItemList executing. sessionState:', sessionState);

  // GUARD: If the user is currently editing an item inline, do NOT blow away
  // the DOM. The edit textarea would be destroyed mid-keystroke.
  // Instead, stash the new state so the next render (after save/cancel) uses it.
  if (container.querySelector('.cc-edit-container')) {
    console.log('[ContextCopilot] Skipping re-render: inline edit in progress');
    container._ccPendingState = sessionState;
    return;
  }

  // Clear container
  container.innerHTML = '';

  if (!sessionState) {
    const noSessionState = document.createElement('div');
    noSessionState.className = 'cc-empty-state';
    noSessionState.style.padding = '20px 12px';
    noSessionState.style.textAlign = 'center';
    noSessionState.style.color = '#999';
    noSessionState.style.lineHeight = '1.6';
    noSessionState.innerHTML = 'No active session for this chat.<br><br>Click <strong style="color:#fff;">+ New Session</strong> above or select an existing session to start.';
    container.appendChild(noSessionState);
    return;
  }

  const items = sessionState?.items || [];
  
  if (items.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'cc-empty-state';
    emptyState.textContent = 'No items recorded yet.';
    container.appendChild(emptyState);
    return;
  }

  // Filter items based on active group, active tag, and keyword (SPEC-12b)
  const filteredItems = items.filter(item => {
    // 1. Group filter
    if (activeGroupFilter && activeGroupFilter.toLowerCase() !== 'all') {
      const itemGroup = (item.group || 'ungrouped').trim().toLowerCase();
      if (itemGroup !== activeGroupFilter.toLowerCase()) {
        return false;
      }
    }

    // 2. Tag filter (exact match from tag pills)
    if (activeTagFilter && activeTagFilter !== 'all') {
      if (item.tag.toLowerCase() !== activeTagFilter) {
        return false;
      }
    }

    // 3. Keyword filter (checks tag, content, optional title, and group)
    if (currentFilter) {
      const tagMatch = item.tag.toLowerCase().includes(currentFilter);
      const contentMatch = item.content.toLowerCase().includes(currentFilter);
      const titleMatch = item.title ? item.title.toLowerCase().includes(currentFilter) : false;
      const groupMatch = item.group ? item.group.toLowerCase().includes(currentFilter) : false;
      return tagMatch || contentMatch || titleMatch || groupMatch;
    }

    return true;
  });

  if (filteredItems.length === 0) {
    const emptyMatch = document.createElement('div');
    emptyMatch.className = 'cc-empty-state';
    emptyMatch.textContent = 'No matches found.';
    container.appendChild(emptyMatch);
    return;
  }

  function renderCard(item, targetContainer) {
    const itemEl = document.createElement('div');
    itemEl.className = 'cc-item';
    itemEl.dataset.id = item.id;
    itemEl.setAttribute('draggable', 'true');
    itemEl.draggable = true;

    // Tag-colored left accent border
    const tagColor = TAG_COLORS[item.tag.toLowerCase()] || '#36d6b5';
    itemEl.style.borderLeft = `3px solid ${tagColor}`;

    // Drag-and-drop event listeners
    itemEl.addEventListener('dragstart', (e) => {
      if (e.target.closest('button, input, textarea, select')) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', item.id);
      e.dataTransfer.effectAllowed = 'move';
      itemEl.classList.add('cc-dragging');
    });

    itemEl.addEventListener('dragend', () => {
      itemEl.classList.remove('cc-dragging');
      container.querySelectorAll('.cc-drag-over-top, .cc-drag-over-bottom').forEach(el => {
        el.classList.remove('cc-drag-over-top', 'cc-drag-over-bottom');
      });
      container.querySelectorAll('.cc-accordion-section.cc-drag-over').forEach(el => {
        el.classList.remove('cc-drag-over');
      });
    });

    itemEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';

      const rect = itemEl.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const isTop = e.clientY < midpoint;

      itemEl.classList.toggle('cc-drag-over-top', isTop);
      itemEl.classList.toggle('cc-drag-over-bottom', !isTop);
    });

    itemEl.addEventListener('dragleave', (e) => {
      if (!itemEl.contains(e.relatedTarget)) {
        itemEl.classList.remove('cc-drag-over-top', 'cc-drag-over-bottom');
      }
    });

    itemEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isTop = itemEl.classList.contains('cc-drag-over-top');
      itemEl.classList.remove('cc-drag-over-top', 'cc-drag-over-bottom');

      const sourceId = e.dataTransfer.getData('text/plain');
      if (!sourceId || sourceId === item.id) return;

      const position = isTop ? 'before' : 'after';
      const section = itemEl.closest('.cc-accordion-section');
      const targetGroup = section ? section.dataset.group : (item.group || '');


      await reorderItem(sessionState.session_id, {
        sourceId,
        targetId: item.id,
        position,
        targetGroup
      });
    });

    // Tag header
    const tagHeader = document.createElement('div');
    tagHeader.className = 'cc-item-tag';
    
    const tagContainer = document.createElement('div');
    tagContainer.style.display = 'flex';
    tagContainer.style.alignItems = 'center';
    tagContainer.style.gap = '6px';

    const dragHandle = document.createElement('span');
    dragHandle.className = 'cc-drag-handle';
    dragHandle.innerHTML = '&#8942;&#8942;';
    dragHandle.title = 'Drag to reorder';
    tagContainer.appendChild(dragHandle);

    const tagText = document.createElement('span');
    const color = TAG_COLORS[item.tag.toLowerCase()] || '#36d6b5';
    tagText.textContent = item.tag.charAt(0).toUpperCase() + item.tag.slice(1);
    tagText.style.color = color;
    tagText.style.fontWeight = '600';
    tagText.style.fontSize = '0.75rem';
    tagText.style.padding = '2px 8px';
    tagText.style.borderRadius = '10px';
    tagText.style.background = color + '18';
    tagText.style.border = `1px solid ${color}40`;
    tagContainer.appendChild(tagText);

    if (item.group && item.group.trim() && item.group.trim().toLowerCase() !== 'ungrouped') {
      const groupBadge = document.createElement('span');
      groupBadge.className = 'cc-item-group-badge';
      groupBadge.textContent = item.group;
      groupBadge.style.fontSize = '0.72rem';
      groupBadge.style.padding = '1px 6px';
      groupBadge.style.borderRadius = '10px';
      groupBadge.style.background = '#2a2d38';
      groupBadge.style.color = '#8e95a5';
      groupBadge.style.fontWeight = '500';
      groupBadge.title = `Group: ${item.group}`;
      tagContainer.appendChild(groupBadge);
    }
    
    // Actions container
    const actions = document.createElement('div');
    actions.className = 'cc-item-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'cc-edit-btn';
    editBtn.textContent = 'Edit';
    
    const delBtn = document.createElement('button');
    delBtn.className = 'cc-delete-btn';
    delBtn.textContent = 'Delete';
    
    actions.append(editBtn, delBtn);
    tagHeader.append(tagContainer, actions);

    // Optional Title Element
    let titleEl = null;
    if (item.title) {
      titleEl = document.createElement('div');
      titleEl.className = 'cc-item-title';
      titleEl.textContent = item.title;
      titleEl.style.fontWeight = '600';
      titleEl.style.color = '#f0f0f0';
      titleEl.style.fontSize = '0.95rem';
      titleEl.style.marginBottom = '4px';
      titleEl.style.wordBreak = 'break-word';
    }
    
    // Content body
    const contentBody = document.createElement('div');
    contentBody.className = 'cc-item-content';
    contentBody.style.display = 'flex';
    contentBody.style.flexDirection = 'column';
    contentBody.style.gap = '4px';

    const textRow = document.createElement('div');
    textRow.style.display = 'flex';
    textRow.style.alignItems = 'flex-start';
    textRow.style.gap = '8px';

    if (item.tag.toLowerCase() === 'task') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'cc-task-checkbox';
      checkbox.checked = !!item.completed;
      checkbox.style.cursor = 'pointer';
      checkbox.style.marginTop = '2px';
      checkbox.style.accentColor = '#a3be8c';
      checkbox.title = 'Mark task done/undone';
      checkbox.addEventListener('change', async () => {
        textSpan.style.textDecoration = checkbox.checked ? 'line-through' : 'none';
        textSpan.style.opacity = checkbox.checked ? '0.6' : '1';
        await toggleTaskCompletion(sessionState.session_id, item.id);
      });
      textRow.appendChild(checkbox);
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = item.content;
    textSpan.style.flexGrow = '1';
    textSpan.style.wordBreak = 'break-word';
    textSpan.style.lineHeight = '1.45';
    if (item.completed) {
      textSpan.style.textDecoration = 'line-through';
      textSpan.style.opacity = '0.6';
    }

    // Card preview truncation / collapse for long content
    const isLongContent = item.content.length > 160 || (item.content.match(/\n/g) || []).length >= 3;
    let isExpanded = false;
    let toggleBtn = null;

    if (isLongContent) {
      textSpan.style.display = '-webkit-box';
      textSpan.style.webkitLineClamp = '3';
      textSpan.style.webkitBoxOrient = 'vertical';
      textSpan.style.overflow = 'hidden';

      toggleBtn = document.createElement('button');
      toggleBtn.className = 'cc-expand-btn';
      toggleBtn.textContent = '▾ Show more';
      toggleBtn.style.background = 'none';
      toggleBtn.style.border = 'none';
      toggleBtn.style.color = '#36d6b5';
      toggleBtn.style.padding = '2px 0 0 0';
      toggleBtn.style.fontSize = '0.8rem';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.style.alignSelf = 'flex-start';
      toggleBtn.style.fontWeight = '500';

      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isExpanded = !isExpanded;
        if (isExpanded) {
          textSpan.style.display = 'block';
          textSpan.style.webkitLineClamp = 'unset';
          textSpan.style.overflow = 'visible';
          toggleBtn.textContent = '▴ Show less';
        } else {
          textSpan.style.display = '-webkit-box';
          textSpan.style.webkitLineClamp = '3';
          textSpan.style.overflow = 'hidden';
          toggleBtn.textContent = '▾ Show more';
        }
      });
    }

    textRow.appendChild(textSpan);
    contentBody.appendChild(textRow);
    if (toggleBtn) {
      contentBody.appendChild(toggleBtn);
    }

    itemEl.appendChild(tagHeader);
    if (titleEl) {
      itemEl.appendChild(titleEl);
    }
    itemEl.appendChild(contentBody);
    
    targetContainer.appendChild(itemEl);

    // SPEC-15: Delete handler
    delBtn.addEventListener('click', async () => {
      await deleteItem(sessionState.session_id, item.id);
    });

    // SPEC-14: Edit handler
    editBtn.addEventListener('click', () => {
      const hadTitle = Boolean(item.title);
      const hadGroup = Boolean(item.group);

      // Enter edit mode
      contentBody.remove();
      if (titleEl) titleEl.remove();
      actions.remove();

      const editContainer = document.createElement('div');
      editContainer.className = 'cc-edit-container';
      editContainer.style.display = 'flex';
      editContainer.style.flexDirection = 'column';
      editContainer.style.gap = '6px';
      editContainer.style.marginTop = '4px';

      const titleInput = document.createElement('input');
      titleInput.className = 'cc-edit-title-input';
      titleInput.type = 'text';
      titleInput.placeholder = 'Title / label (optional)...';
      titleInput.value = item.title || '';
      titleInput.style.padding = '4px 6px';
      titleInput.style.background = '#222';
      titleInput.style.color = '#fff';
      titleInput.style.border = '1px solid #444';
      titleInput.style.borderRadius = '4px';
      titleInput.style.fontSize = '0.85rem';

      const textarea = document.createElement('textarea');
      textarea.className = 'cc-edit-textarea';
      textarea.value = item.content;
      textarea.style.resize = 'vertical';
      textarea.style.minHeight = '60px';
      textarea.style.padding = '6px';
      textarea.style.background = '#222';
      textarea.style.color = '#fff';
      textarea.style.border = '1px solid #444';
      textarea.style.borderRadius = '4px';
      textarea.style.fontSize = '0.9rem';

      // Group selection dropdown in edit mode
      const groupSelect = document.createElement('select');
      groupSelect.className = 'cc-edit-group-select';
      groupSelect.style.padding = '4px 6px';
      groupSelect.style.background = '#222';
      groupSelect.style.color = '#fff';
      groupSelect.style.border = '1px solid #444';
      groupSelect.style.borderRadius = '4px';
      groupSelect.style.fontSize = '0.85rem';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Ungrouped';
      groupSelect.appendChild(defaultOpt);

      const availableGroups = new Set(sessionState?.groups || []);
      if (item.group && item.group.trim()) {
        availableGroups.add(item.group.trim());
      }
      for (const g of availableGroups) {
        if (!g || g.toLowerCase() === 'ungrouped' || g.toLowerCase() === 'all') continue;
        const opt = document.createElement('option');
        opt.value = g;
        opt.textContent = g;
        if (item.group && item.group.trim().toLowerCase() === g.toLowerCase()) {
          opt.selected = true;
        }
        groupSelect.appendChild(opt);
      }

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'cc-save-btn';
      saveBtn.textContent = 'Save';
      saveBtn.style.padding = '4px 8px';

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'cc-cancel-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.padding = '4px 8px';

      btnRow.append(saveBtn, cancelBtn);
      editContainer.append(titleInput, textarea, groupSelect, btnRow);
      itemEl.appendChild(editContainer);

      saveBtn.addEventListener('click', async () => {
        const newContent = textarea.value.trim();
        const newTitle = titleInput.value.trim();
        const newGroup = groupSelect.value.trim();


        if (newContent) {
          // Exit edit mode immediately
          editContainer.remove();
          tagHeader.appendChild(actions);

          // Update title if needed
          if (newTitle) {
            item.title = newTitle;
            if (!titleEl) {
              titleEl = document.createElement('div');
              titleEl.className = 'cc-item-title';
              titleEl.style.fontWeight = '600';
              titleEl.style.color = '#f0f0f0';
              titleEl.style.fontSize = '0.95rem';
              titleEl.style.marginBottom = '4px';
              titleEl.style.wordBreak = 'break-word';
            }
            titleEl.textContent = newTitle;
            tagHeader.after(titleEl);
          } else {
            delete item.title;
            if (titleEl) {
              titleEl.remove();
              titleEl = null;
            }
          }

          // Update group badge
          if (newGroup) {
            item.group = newGroup;
            let badge = tagContainer.querySelector('.cc-item-group-badge');
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'cc-item-group-badge';
              badge.style.fontSize = '0.72rem';
              badge.style.padding = '1px 6px';
              badge.style.borderRadius = '10px';
              badge.style.background = '#3b4252';
              badge.style.color = '#88c0d0';
              badge.style.fontWeight = '500';
              tagContainer.appendChild(badge);
            }
            badge.textContent = newGroup;
            badge.title = `Group: ${newGroup}`;
          } else {
            delete item.group;
            const badge = tagContainer.querySelector('.cc-item-group-badge');
            if (badge) badge.remove();
          }

          textSpan.textContent = newContent;
          itemEl.appendChild(contentBody);

          if (hadGroup || newGroup) {
            await editItem(
              sessionState.session_id,
              item.id,
              newContent,
              (hadTitle || newTitle) ? newTitle : '',
              newGroup
            );
          } else if (hadTitle || newTitle) {
            await editItem(
              sessionState.session_id,
              item.id,
              newContent,
              newTitle
            );
          } else {
            await editItem(
              sessionState.session_id,
              item.id,
              newContent
            );
          }

          // Flush any state updates that arrived while we were editing
          if (container._ccPendingState) {
            const pending = container._ccPendingState;
            delete container._ccPendingState;
            renderItemList(container, pending);
          }
        }
      });

      cancelBtn.addEventListener('click', () => {
        // Exit edit mode without saving
        editContainer.remove();
        tagHeader.appendChild(actions);
        if (titleEl) tagHeader.after(titleEl);
        itemEl.appendChild(contentBody);

        // Flush any state updates that arrived while we were editing
        if (container._ccPendingState) {
          const pending = container._ccPendingState;
          delete container._ccPendingState;
          renderItemList(container, pending);
        }
      });
    });
  }

  // Check if accordion sections should be shown
  const hasGroups = filteredItems.some(i => Boolean(i.group && i.group.trim() && i.group.trim().toLowerCase() !== 'ungrouped'));

  if (activeGroupFilter === 'all' && hasGroups) {
    const groupOrder = [];
    const seenGroups = new Set();

    if (Array.isArray(sessionState.groups)) {
      for (const g of sessionState.groups) {
        const lower = g.toLowerCase();
        if (!seenGroups.has(lower) && lower !== 'ungrouped' && lower !== 'all') {
          seenGroups.add(lower);
          groupOrder.push({ name: g, key: lower });
        }
      }
    }

    for (const item of filteredItems) {
      if (item.group && item.group.trim()) {
        const lower = item.group.trim().toLowerCase();
        if (!seenGroups.has(lower) && lower !== 'ungrouped' && lower !== 'all') {
          seenGroups.add(lower);
          groupOrder.push({ name: item.group.trim(), key: lower });
        }
      }
    }

    groupOrder.push({ name: 'Ungrouped', key: 'ungrouped' });

    for (const grp of groupOrder) {
      const groupItems = filteredItems.filter(i => {
        const g = (i.group || 'ungrouped').trim().toLowerCase();
        return g === grp.key;
      });

      if (groupItems.length === 0) continue;

      const isCollapsed = collapsedGroups.has(grp.key);

      const section = document.createElement('div');
      section.className = 'cc-accordion-section';
      section.dataset.group = grp.name;
      section.style.marginBottom = '10px';

      const header = document.createElement('div');
      header.className = 'cc-accordion-header';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.padding = '6px 8px';
      header.style.background = '#1c1f27';
      header.style.border = '1px solid #2a2d38';
      header.style.borderRadius = '4px';
      header.style.cursor = 'pointer';
      header.style.userSelect = 'none';
      header.style.marginBottom = '6px';
      header.style.fontSize = '0.85rem';
      header.style.fontWeight = '600';
      header.style.color = '#eceff4';

      const leftPart = document.createElement('div');
      leftPart.style.display = 'flex';
      leftPart.style.alignItems = 'center';
      leftPart.style.gap = '6px';

      const arrow = document.createElement('span');
      arrow.className = 'cc-accordion-arrow';
      arrow.textContent = isCollapsed ? '▸' : '▾';
      arrow.style.fontSize = '10px';
      arrow.style.color = '#36d6b5';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.className = 'cc-group-inject-checkbox';
      checkbox.dataset.group = grp.key;
      checkbox.title = 'Include this group when injecting context';
      checkbox.style.cursor = 'pointer';
      // Prevent accordion toggle when clicking checkbox
      checkbox.addEventListener('click', (e) => e.stopPropagation());

      const title = document.createElement('span');
      title.textContent = grp.name;

      leftPart.append(arrow, checkbox, title);

      const count = document.createElement('span');
      count.className = 'cc-accordion-count';
      count.style.fontSize = '0.75rem';
      count.style.color = '#36d6b5';
      count.textContent = `(${groupItems.length})`;

      header.append(leftPart, count);

      const content = document.createElement('div');
      content.className = 'cc-accordion-content';
      content.style.display = isCollapsed ? 'none' : 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = '8px';

      header.addEventListener('click', () => {
        const collapsed = content.style.display === 'none';
        if (collapsed) {
          content.style.display = 'flex';
          arrow.textContent = '▾';
          collapsedGroups.delete(grp.key);
        } else {
          content.style.display = 'none';
          arrow.textContent = '▸';
          collapsedGroups.add(grp.key);
        }
      });

      header.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        section.classList.add('cc-drag-over');
      });

      header.addEventListener('dragleave', (e) => {
        if (!header.contains(e.relatedTarget)) {
          section.classList.remove('cc-drag-over');
        }
      });

      header.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        section.classList.remove('cc-drag-over');



        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId) return;

        await reorderItem(sessionState.session_id, {
          sourceId,
          targetGroup: grp.name
        });
      });

      groupItems.forEach(item => renderCard(item, content));

      section.append(header, content);
      container.appendChild(section);
    }
  } else {
    // Flat rendering when filtered to a specific group or no groups exist
    filteredItems.forEach(item => renderCard(item, container));
  }
}

export function getCheckedGroups() {
  const host = document.getElementById('cc-sidebar-host');
  if (!host || !host.shadowRoot) return null;

  const container = host.shadowRoot.getElementById('cc-item-container');
  if (!container) return null; // No UI rendered

  const checkboxes = container.querySelectorAll('.cc-group-inject-checkbox');
  if (checkboxes.length === 0) return null; // Flat view or no groups

  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selected.push(cb.dataset.group.toLowerCase());
    }
  });
  return selected;
}

