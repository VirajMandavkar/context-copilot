// tests/sidebar/item-card-enhancements.test.js — Tests for card truncation, titles, and decoupled tag filtering

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderItemList,
  setFilterText,
  setActiveTagFilter,
  getActiveTagFilter,
} from '../../src/sidebar/item-list.js';
import * as engine from '../../src/storage/engine.js';

describe('Item Card Enhancements & Filter Decoupling', () => {
  let container;

  function getSampleState() {
    return {
      session_id: 's1',
      items: [
        {
          id: '1',
          tag: 'decision',
          title: 'Proxy Architecture',
          content: 'Configure Go proxy to wrap static payload in ephemeral cache control block.',
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: '2',
          tag: 'decision',
          content: 'This decision discusses constraints in the system, but is still a decision.',
          created_at: '2023-01-02T00:00:00Z',
        },
        {
          id: '3',
          tag: 'constraint',
          title: 'Max Payload Limit',
          content: 'CLI agent payload cannot exceed 50MB per round trip.',
          created_at: '2023-01-03T00:00:00Z',
        },
        {
          id: '4',
          tag: 'task',
          content: 'A very long task item: ' + 'This is step details that go on and on. '.repeat(10),
          created_at: '2023-01-04T00:00:00Z',
        },
      ],
    };
  }

  let sampleState;

  beforeEach(() => {
    container = document.createElement('div');
    container.className = 'cc-item-list';
    document.body.appendChild(container);
    setFilterText('');
    setActiveTagFilter('all');
    sampleState = getSampleState();
  });

  afterEach(() => {
    container.remove();
    setFilterText('');
    setActiveTagFilter('all');
    vi.restoreAllMocks();
  });

  it('renders bold title when item.title is present', () => {
    renderItemList(container, sampleState);
    const itemEl = container.querySelector('[data-id="1"]');
    const titleEl = itemEl.querySelector('.cc-item-title');

    expect(titleEl).not.toBeNull();
    expect(titleEl.textContent).toBe('Proxy Architecture');
  });

  it('does not render .cc-item-title when item has no title', () => {
    renderItemList(container, sampleState);
    const itemEl = container.querySelector('[data-id="2"]');
    expect(itemEl.querySelector('.cc-item-title')).toBeNull();
  });

  it('decouples tag pill filtering from keyword search (does not show decision containing "constraints")', () => {
    setActiveTagFilter('constraint');
    renderItemList(container, sampleState);

    const items = container.querySelectorAll('.cc-item');
    // Only item 3 is an actual constraint. Item 2 mentions "constraints" but its tag is decision.
    expect(items.length).toBe(1);
    expect(items[0].dataset.id).toBe('3');
    expect(items[0].textContent).toContain('Max Payload Limit');
  });

  it('supports combining active tag filter with keyword search', () => {
    setActiveTagFilter('decision');
    setFilterText('Proxy');
    renderItemList(container, sampleState);

    const items = container.querySelectorAll('.cc-item');
    expect(items.length).toBe(1);
    expect(items[0].dataset.id).toBe('1');
  });

  it('renders expand button for long notes and toggles expansion', () => {
    renderItemList(container, sampleState);
    const longItem = container.querySelector('[data-id="4"]');
    const expandBtn = longItem.querySelector('.cc-expand-btn');

    expect(expandBtn).not.toBeNull();
    expect(expandBtn.textContent).toBe('▾ Show more');

    // Click to expand
    expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(expandBtn.textContent).toBe('▴ Show less');

    // Click to collapse
    expandBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(expandBtn.textContent).toBe('▾ Show more');
  });

  it('allows editing title and content in edit mode', async () => {
    const editSpy = vi.spyOn(engine, 'editItem').mockResolvedValue(true);
    renderItemList(container, sampleState);

    const itemEl = container.querySelector('[data-id="1"]');
    const editBtn = itemEl.querySelector('.cc-edit-btn');
    editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const titleInput = itemEl.querySelector('.cc-edit-title-input');
    const textarea = itemEl.querySelector('.cc-edit-textarea');
    expect(titleInput).not.toBeNull();
    expect(titleInput.value).toBe('Proxy Architecture');

    titleInput.value = 'New Title';
    textarea.value = 'Updated Content';

    const saveBtn = itemEl.querySelector('.cc-save-btn');
    saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editSpy).toHaveBeenCalledWith('s1', '1', 'Updated Content', 'New Title');
    expect(itemEl.querySelector('.cc-item-title').textContent).toBe('New Title');
  });

  it('allows clearing the title completely by setting it empty in edit mode', async () => {
    const editSpy = vi.spyOn(engine, 'editItem').mockResolvedValue(true);
    renderItemList(container, sampleState);

    const itemEl = container.querySelector('[data-id="1"]');
    const editBtn = itemEl.querySelector('.cc-edit-btn');
    editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const titleInput = itemEl.querySelector('.cc-edit-title-input');
    const textarea = itemEl.querySelector('.cc-edit-textarea');
    expect(titleInput.value).toBe('Proxy Architecture');

    // Clear the title completely
    titleInput.value = '';
    textarea.value = 'Updated Content';

    const saveBtn = itemEl.querySelector('.cc-save-btn');
    saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editSpy).toHaveBeenCalledWith('s1', '1', 'Updated Content', '');
    expect(itemEl.querySelector('.cc-item-title')).toBeNull();
  });
});
