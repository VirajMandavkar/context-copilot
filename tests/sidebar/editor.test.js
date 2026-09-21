// tests/sidebar/editor.test.js — Sidebar item edit/delete
// Tests for: SPEC-14 (editing), SPEC-15 (deletion)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderItemList } from '../../src/sidebar/item-list.js';
import * as engine from '../../src/storage/engine.js';

describe('Item Editor/Deleter (SPEC-14, 15)', () => {
  let container;
  const mockState = {
    session_id: 't1',
    items: [
      { id: '1', tag: 'note', content: 'Test note', created_at: '2023-01-01' }
    ]
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  describe('Edit (SPEC-14)', () => {
    it('shows a textarea with existing content when edit is clicked', () => {
      renderItemList(container, mockState, 't1');
      const itemEl = container.querySelector('.cc-item');
      
      const editBtn = itemEl.querySelector('.cc-edit-btn');
      expect(editBtn).not.toBeNull();
      
      editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      // Should turn into an edit mode
      const textarea = itemEl.querySelector('.cc-edit-textarea');
      expect(textarea).not.toBeNull();
      expect(textarea.value).toBe('Test note');
      
      // Original content should be hidden or removed
      expect(itemEl.querySelector('.cc-item-content')).toBeNull();
    });

    it('saves edits via the storage engine and exits edit mode', async () => {
      const editSpy = vi.spyOn(engine, 'editItem').mockResolvedValue(true);
      
      renderItemList(container, mockState, 't1');
      const itemEl = container.querySelector('.cc-item');
      
      itemEl.querySelector('.cc-edit-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      const textarea = itemEl.querySelector('.cc-edit-textarea');
      textarea.value = 'Updated note';
      
      const saveBtn = itemEl.querySelector('.cc-save-btn');
      expect(saveBtn).not.toBeNull();
      
      saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      expect(editSpy).toHaveBeenCalledWith('t1', '1', 'Updated note');
      expect(itemEl.querySelector('.cc-edit-container')).toBeNull();
      expect(itemEl.querySelector('.cc-item-content').textContent).toContain('Updated note');
    });

    it('cancels edits without saving', () => {
      const editSpy = vi.spyOn(engine, 'editItem');
      
      renderItemList(container, mockState, 't1');
      const itemEl = container.querySelector('.cc-item');
      
      itemEl.querySelector('.cc-edit-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      const textarea = itemEl.querySelector('.cc-edit-textarea');
      textarea.value = 'Hacked note';
      
      const cancelBtn = itemEl.querySelector('.cc-cancel-btn');
      cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      expect(editSpy).not.toHaveBeenCalled();
      
      // Verify reverts to view mode
      expect(itemEl.querySelector('.cc-edit-textarea')).toBeNull();
      expect(itemEl.querySelector('.cc-item-content').textContent).toBe('Test note');
    });
  });

  describe('Delete (SPEC-15)', () => {
    it('deletes the item via storage engine', async () => {
      const delSpy = vi.spyOn(engine, 'deleteItem').mockResolvedValue(true);
      
      renderItemList(container, mockState, 't1');
      const itemEl = container.querySelector('.cc-item');
      
      const delBtn = itemEl.querySelector('.cc-delete-btn');
      expect(delBtn).not.toBeNull();
      
      delBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      expect(delSpy).toHaveBeenCalledWith('t1', '1');
    });
  });
});
