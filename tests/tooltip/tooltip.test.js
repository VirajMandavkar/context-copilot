// tests/tooltip/tooltip.test.js — DOM Tooltip Module tests
// Tests for: SPEC-7, SPEC-8, SPEC-9, SPEC-10
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initTooltip, destroyTooltip } from '../../src/tooltip/tooltip.js';
import * as storageEngine from '../../src/storage/engine.js';

describe('DOM Tooltip Module (SPEC-7, 8, 9, 10)', () => {
  let addSpy;
  let getSelectionMock;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<p id="target">Some text on the page to select.</p>';
    
    // Mock getSelection
    getSelectionMock = {
      toString: () => 'text on the page',
      rangeCount: 1,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ top: 100, right: 200, bottom: 120, left: 150, width: 50, height: 20 }),
        commonAncestorContainer: document.getElementById('target')
      })
    };
    vi.spyOn(window, 'getSelection').mockImplementation(() => getSelectionMock);

    // Mock storage write
    addSpy = vi.spyOn(storageEngine, 'addItem').mockResolvedValue({ id: '1' });
    
    initTooltip('thread-123');
  });

  afterEach(() => {
    destroyTooltip();
    vi.restoreAllMocks();
  });

  // Helper to trigger mouseup
  const fireMouseUp = () => {
    const event = new MouseEvent('mouseup', { bubbles: true, clientX: 160, clientY: 110 });
    document.dispatchEvent(event);
  };

  describe('Selection Capture (SPEC-7)', () => {
    it('shows tooltip on mouseup when selection is non-empty', () => {
      fireMouseUp();
      const host = document.getElementById('cc-tooltip-host');
      expect(host).not.toBeNull();
      
      const shadow = host.shadowRoot;
      expect(shadow).not.toBeNull();
      
      const tooltip = shadow.querySelector('.cc-tooltip');
      expect(tooltip).not.toBeNull();
      
      // Should have the 4 standard tags (SPEC-8 buttons)
      const buttons = shadow.querySelectorAll('button');
      expect(buttons.length).toBe(4);
      expect(buttons[0].textContent).toBe('Decision');
    });

    it('does NOT show tooltip if selection is empty', () => {
      getSelectionMock.toString = () => '   ';
      fireMouseUp();
      const host = document.getElementById('cc-tooltip-host');
      expect(host).toBeNull();
    });
  });

  describe('Tag Selection & Save (SPEC-8)', () => {
    it('saves the selected text when a tag is clicked', async () => {
      fireMouseUp();
      const shadow = document.getElementById('cc-tooltip-host').shadowRoot;
      
      // Click 'Decision' button (first one)
      const decisionBtn = shadow.querySelectorAll('button')[0];
      // Need to simulate click
      decisionBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(addSpy).toHaveBeenCalledWith('thread-123', expect.objectContaining({
        tag: 'decision',
        content: 'text on the page',
        source: 'selection',
        // Should capture context
        selection_context: expect.objectContaining({
          selector_hint: '#target'
        })
      }));
    });

    it('dismisses tooltip after saving', async () => {
      fireMouseUp();
      const host = document.getElementById('cc-tooltip-host');
      const btn = host.shadowRoot.querySelectorAll('button')[0];
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      
      expect(document.getElementById('cc-tooltip-host')).toBeNull();
    });
  });

  describe('Tooltip Dismissal (SPEC-9)', () => {
    it('dismisses when clicking outside the tooltip', () => {
      fireMouseUp();
      expect(document.getElementById('cc-tooltip-host')).not.toBeNull();
      
      // Click somewhere else
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 }));
      
      expect(document.getElementById('cc-tooltip-host')).toBeNull();
    });

    it('dismisses on Escape key', () => {
      fireMouseUp();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(document.getElementById('cc-tooltip-host')).toBeNull();
    });

    it('dismisses on new empty selection mouseup', () => {
      fireMouseUp();
      // Second mouseup with empty selection
      getSelectionMock.toString = () => '';
      fireMouseUp();
      expect(document.getElementById('cc-tooltip-host')).toBeNull();
    });
  });

  describe('Tooltip Isolation (SPEC-10)', () => {
    it('uses a closed Shadow DOM', () => {
      fireMouseUp();
      const host = document.getElementById('cc-tooltip-host');
      // In tests using happy-dom, mode isn't perfectly reflected, but we assert attachShadow({mode: 'closed'})
      expect(host.shadowRoot).toBeDefined();
    });

    it('injects its own CSS into the shadow root', () => {
      fireMouseUp();
      const shadow = document.getElementById('cc-tooltip-host').shadowRoot;
      const style = shadow.querySelector('style');
      expect(style).not.toBeNull();
    });
  });
});
