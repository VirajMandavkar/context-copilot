// tests/sidebar/item-list.test.js — Item List Rendering tests
// Tests for: SPEC-12 (rendering), SPEC-12b (filtering)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderItemList, setFilterText } from '../../src/sidebar/item-list.js';

describe('Sidebar Item List (SPEC-12, SPEC-12b)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.className = 'cc-item-list';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  const mockState = {
    thread_id: 't1',
    items: [
      { id: '1', tag: 'decision', content: 'Use React 18', created_at: '2023-01-01' },
      { id: '2', tag: 'constraint', content: 'No network calls', created_at: '2023-01-02' },
      { id: '3', tag: 'task', content: 'Build sidebar', created_at: '2023-01-03' }
    ]
  };

  it('renders a list of items into the container', () => {
    renderItemList(container, mockState);
    const itemDivs = container.querySelectorAll('.cc-item');
    expect(itemDivs.length).toBe(3);
  });

  it('displays the tag and content for each item', () => {
    renderItemList(container, mockState);
    const itemDivs = container.querySelectorAll('.cc-item');
    
    expect(itemDivs[0].textContent).toContain('Decision');
    expect(itemDivs[0].textContent).toContain('Use React 18');
  });

  it('clears previous contents before rendering', () => {
    renderItemList(container, mockState);
    renderItemList(container, mockState);
    const itemDivs = container.querySelectorAll('.cc-item');
    expect(itemDivs.length).toBe(3); // Should not double to 6
  });

  describe('Keyword Filtering (SPEC-12b)', () => {
    it('filters items by content', () => {
      setFilterText('react');
      renderItemList(container, mockState);
      const itemDivs = container.querySelectorAll('.cc-item');
      
      expect(itemDivs.length).toBe(1);
      expect(itemDivs[0].textContent).toContain('Use React 18');
    });

    it('filters items by tag', () => {
      setFilterText('constraint');
      renderItemList(container, mockState);
      const itemDivs = container.querySelectorAll('.cc-item');
      
      expect(itemDivs.length).toBe(1);
      expect(itemDivs[0].textContent).toContain('No network calls');
    });

    it('is case-insensitive', () => {
      setFilterText('REACT');
      renderItemList(container, mockState);
      expect(container.querySelectorAll('.cc-item').length).toBe(1);
    });

    it('shows all items when filter is empty', () => {
      setFilterText('   ');
      renderItemList(container, mockState);
      expect(container.querySelectorAll('.cc-item').length).toBe(3);
    });
  });

  it('displays an empty state message if no items exist', () => {
    renderItemList(container, { thread_id: 't1', items: [] });
    expect(container.textContent).toContain('No items recorded');
  });

  it('displays a no-match message if filter hides all items', () => {
    setFilterText('notfound');
    renderItemList(container, mockState);
    expect(container.textContent).toContain('No matches found');
  });
});
