// tests/sidebar/item-list-grouping.test.js — Item List Grouping and Accordion tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  renderItemList,
  setActiveGroupFilter,
  getActiveGroupFilter,
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

describe('Item List Grouping and Accordions', () => {
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
    groups: ['Frontend UI', 'Backend Go'],
    items: [
      { id: '1', tag: 'decision', title: 'React 18', content: 'Use concurrent features', group: 'Frontend UI', created_at: '2023-01-01' },
      { id: '2', tag: 'task', content: 'Build navbar', group: 'Frontend UI', created_at: '2023-01-02' },
      { id: '3', tag: 'decision', content: 'Use Gin router', group: 'Backend Go', created_at: '2023-01-03' },
      { id: '4', tag: 'note', content: 'General project overview', created_at: '2023-01-04' } // Ungrouped
    ]
  };

  it('renders group badge on items that belong to a group', () => {
    renderItemList(container, mockSession);

    const badges = container.querySelectorAll('.cc-item-group-badge');
    expect(badges.length).toBe(3);
    expect(badges[0].textContent).toBe('Frontend UI');
    expect(badges[1].textContent).toBe('Frontend UI');
    expect(badges[2].textContent).toBe('Backend Go');
  });

  it('renders accordion sections when on "all" groups and groups exist', () => {
    renderItemList(container, mockSession);

    const sections = container.querySelectorAll('.cc-accordion-section');
    expect(sections.length).toBe(3); // Frontend UI, Backend Go, Ungrouped

    const headers = container.querySelectorAll('.cc-accordion-header');
    expect(headers[0].textContent).toContain('Frontend UI');
    expect(headers[0].textContent).toContain('(2)');
    expect(headers[1].textContent).toContain('Backend Go');
    expect(headers[1].textContent).toContain('(1)');
    expect(headers[2].textContent).toContain('Ungrouped');
    expect(headers[2].textContent).toContain('(1)');
  });

  it('toggles accordion section collapse on header click', () => {
    renderItemList(container, mockSession);

    const firstHeader = container.querySelector('.cc-accordion-header');
    const firstContent = container.querySelector('.cc-accordion-content');
    const firstArrow = firstHeader.querySelector('.cc-accordion-arrow');

    expect(firstContent.style.display).not.toBe('none');
    expect(firstArrow.textContent).toBe('▾');

    // Click to collapse
    firstHeader.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstContent.style.display).toBe('none');
    expect(firstArrow.textContent).toBe('▸');

    // Click to expand again
    firstHeader.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstContent.style.display).toBe('flex');
    expect(firstArrow.textContent).toBe('▾');
  });

  it('filters items when activeGroupFilter is set to a specific group', () => {
    setActiveGroupFilter('Frontend UI');
    expect(getActiveGroupFilter()).toBe('Frontend UI');

    renderItemList(container, mockSession);

    // Should not render accordions when scoped to a single group
    expect(container.querySelectorAll('.cc-accordion-section').length).toBe(0);

    const items = container.querySelectorAll('.cc-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Use concurrent features');
    expect(items[1].textContent).toContain('Build navbar');
  });

  it('filters items when activeGroupFilter is "ungrouped"', () => {
    setActiveGroupFilter('ungrouped');
    renderItemList(container, mockSession);

    const items = container.querySelectorAll('.cc-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('General project overview');
  });

  it('provides group selector in card edit mode and allows reassigning group', async () => {
    const editSpy = vi.spyOn(engine, 'editItem').mockResolvedValue({});

    renderItemList(container, mockSession);

    const firstItem = container.querySelector('.cc-item[data-id="1"]');
    const editBtn = firstItem.querySelector('.cc-edit-btn');
    editBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const groupSelect = firstItem.querySelector('.cc-edit-group-select');
    expect(groupSelect).not.toBeNull();
    expect(groupSelect.value).toBe('Frontend UI');

    // Verify available options
    const options = Array.from(groupSelect.options).map(o => o.value);
    expect(options).toContain('');
    expect(options).toContain('Frontend UI');
    expect(options).toContain('Backend Go');

    // Change group to Backend Go
    groupSelect.value = 'Backend Go';

    const saveBtn = firstItem.querySelector('.cc-save-btn');
    saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(editSpy).toHaveBeenCalledWith(
      's1',
      '1',
      'Use concurrent features',
      'React 18',
      'Backend Go'
    );
  });
});
