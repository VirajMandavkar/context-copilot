// tests/sidebar/item-list-drag.test.js — Item List Drag and Drop UI tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderItemList,
  setActiveGroupFilter,
  setActiveTagFilter,
  setFilterText
} from '../../src/sidebar/item-list.js';
import * as engine from '../../src/storage/engine.js';

vi.mock('../../src/license/guard.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isGroupingAllowedSync: () => true
  };
});

describe('Item List Drag-and-Drop UI', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.className = 'cc-item-list';
    document.body.appendChild(container);

    setActiveGroupFilter('all');
    setActiveTagFilter('all');
    setFilterText('');
  });

  afterEach(() => {
    container.remove();
  });

  const mockSession = {
    session_id: 's1',
    groups: ['Frontend', 'Backend'],
    items: [
      { id: '1', tag: 'decision', content: 'Card 1', group: 'Frontend', created_at: '2023-01-01' },
      { id: '2', tag: 'task', content: 'Card 2', group: 'Frontend', created_at: '2023-01-02' },
      { id: '3', tag: 'note', content: 'Card 3', group: 'Backend', created_at: '2023-01-03' }
    ]
  };

  it('renders a drag handle on each card with draggable attribute', () => {
    renderItemList(container, mockSession);

    const items = container.querySelectorAll('.cc-item');
    expect(items.length).toBe(3);

    items.forEach(item => {
      expect(item.getAttribute('draggable')).toBe('true');
      const handle = item.querySelector('.cc-drag-handle');
      expect(handle).not.toBeNull();
      expect(handle.textContent).toContain('⋮⋮');
    });
  });

  it('sets dataTransfer on dragstart and adds cc-dragging class', () => {
    renderItemList(container, mockSession);

    const firstItem = container.querySelector('.cc-item[data-id="1"]');

    const setDataSpy = vi.fn();
    const dragEvent = new Event('dragstart', { bubbles: true });
    dragEvent.dataTransfer = {
      setData: setDataSpy,
      effectAllowed: ''
    };

    firstItem.dispatchEvent(dragEvent);

    expect(setDataSpy).toHaveBeenCalledWith('text/plain', '1');
    expect(firstItem.classList.contains('cc-dragging')).toBe(true);
  });

  it('cleans up cc-dragging class and indicators on dragend', () => {
    renderItemList(container, mockSession);

    const firstItem = container.querySelector('.cc-item[data-id="1"]');
    firstItem.classList.add('cc-dragging');
    firstItem.classList.add('cc-drag-over-top');

    const dragEndEvent = new Event('dragend', { bubbles: true });
    firstItem.dispatchEvent(dragEndEvent);

    expect(firstItem.classList.contains('cc-dragging')).toBe(false);
    expect(firstItem.classList.contains('cc-drag-over-top')).toBe(false);
  });

  it('handles dragover and toggles top/bottom indicator classes based on cursor position', () => {
    renderItemList(container, mockSession);

    const firstItem = container.querySelector('.cc-item[data-id="1"]');
    vi.spyOn(firstItem, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      height: 60,
      bottom: 160
    });

    // Cursor at top half (Y = 120 < 130 midpoint)
    const dragOverTop = new MouseEvent('dragover', { bubbles: true, clientY: 120 });
    dragOverTop.dataTransfer = {};
    firstItem.dispatchEvent(dragOverTop);

    expect(firstItem.classList.contains('cc-drag-over-top')).toBe(true);
    expect(firstItem.classList.contains('cc-drag-over-bottom')).toBe(false);

    // Cursor at bottom half (Y = 140 > 130 midpoint)
    const dragOverBottom = new MouseEvent('dragover', { bubbles: true, clientY: 140 });
    dragOverBottom.dataTransfer = {};
    firstItem.dispatchEvent(dragOverBottom);

    expect(firstItem.classList.contains('cc-drag-over-top')).toBe(false);
    expect(firstItem.classList.contains('cc-drag-over-bottom')).toBe(true);
  });

  it('triggers reorderItem with correct parameters on card drop', async () => {
    const reorderSpy = vi.spyOn(engine, 'reorderItem').mockResolvedValue(true);

    renderItemList(container, mockSession);

    const secondItem = container.querySelector('.cc-item[data-id="2"]');
    secondItem.classList.add('cc-drag-over-top');

    const dropEvent = new MouseEvent('drop', { bubbles: true });
    dropEvent.dataTransfer = {
      getData: (type) => (type === 'text/plain' ? '1' : '')
    };

    secondItem.dispatchEvent(dropEvent);

    expect(reorderSpy).toHaveBeenCalledWith('s1', {
      sourceId: '1',
      targetId: '2',
      position: 'before',
      targetGroup: 'Frontend'
    });
  });

  it('triggers reorderItem with targetGroup on accordion header drop', async () => {
    const reorderSpy = vi.spyOn(engine, 'reorderItem').mockResolvedValue(true);

    renderItemList(container, mockSession);

    const headers = container.querySelectorAll('.cc-accordion-header');
    // Backend group header is index 1
    const backendHeader = headers[1];

    const dropEvent = new MouseEvent('drop', { bubbles: true });
    dropEvent.dataTransfer = {
      getData: (type) => (type === 'text/plain' ? '1' : '')
    };

    backendHeader.dispatchEvent(dropEvent);

    expect(reorderSpy).toHaveBeenCalledWith('s1', {
      sourceId: '1',
      targetGroup: 'Backend'
    });
  });
});
