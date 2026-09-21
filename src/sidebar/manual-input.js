// src/sidebar/manual-input.js — Manual Input UI (SPEC-13)

import { addItem } from '../storage/engine.js';
import { openProModal } from './pro-modal.js';

/**
 * Binds the manual input form elements to the storage engine.
 *
 * @param {string} sessionId 
 * @param {Object} elements 
 * @param {HTMLInputElement} [elements.titleInput]
 * @param {HTMLTextAreaElement} elements.textarea 
 * @param {HTMLSelectElement} elements.select 
 * @param {HTMLSelectElement} [elements.groupSelect]
 * @param {HTMLButtonElement} elements.button 
 */
export function setupManualInputUI(sessionId, { titleInput, textarea, select, groupSelect, button }, onEnsureSession = null) {
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[ContextCopilot] MANUAL SAVE CLICKED', { sessionId });

    const content = (textarea.value || '').trim();
    if (!content) {
      console.log('[ContextCopilot] Manual save rejected: Content is empty.');
      return; 
    }

    let targetSessionId = sessionId;
    if (!targetSessionId && onEnsureSession) {
      targetSessionId = await onEnsureSession();
    }
    if (!targetSessionId) {
      console.log('[ContextCopilot] Cannot save manual input: No active session.');
      return;
    }

    const tag = select.value;
    const title = (titleInput?.value || '').trim();
    const group = (groupSelect?.value || '').trim();
    console.log('[ContextCopilot] Attempting to save manual input:', { tag, title, group, content });

    const itemData = {
      tag,
      content,
      source: 'manual'
    };
    if (title) {
      itemData.title = title;
    }
    if (group && group.toLowerCase() !== 'ungrouped' && group.toLowerCase() !== 'all') {
      itemData.group = group;
    }

    try {
      await addItem(targetSessionId, itemData);
      console.log('[ContextCopilot] Manual input saved successfully to storage engine!');
      // Clear on success
      textarea.value = '';
      if (titleInput) titleInput.value = '';
    } catch (err) {
      console.error('[ContextCopilot] FAILED to save manual input:', err);
      if (err?.message?.includes('Free tier is limited')) {
        const sidebar = button.closest('.cc-sidebar') || document.querySelector('#cc-sidebar-host')?.shadowRoot || document.body;
        openProModal(sidebar, err.message);
      }
    }
  });
}
