// tests/sidebar/forms.test.js — Sidebar forms (Filter & Manual Input)
// Tests for: SPEC-12b (filter UI), SPEC-13 (manual input form)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupFilterUI } from '../../src/sidebar/filter.js';
import { setupManualInputUI } from '../../src/sidebar/manual-input.js';
import * as engine from '../../src/storage/engine.js';

describe('Sidebar Forms (SPEC-12b, SPEC-13)', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  describe('Filter UI (SPEC-12b)', () => {
    it('calls the render callback when filter text changes', () => {
      const renderSpy = vi.fn();
      const input = document.createElement('input');
      container.appendChild(input);

      setupFilterUI(input, renderSpy);
      
      input.value = 'test';
      input.dispatchEvent(new Event('input'));
      
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('Manual Input UI (SPEC-13)', () => {
    let textarea, select, button;
    
    beforeEach(() => {
      textarea = document.createElement('textarea');
      select = document.createElement('select');
      
      // Setup options per SPEC-2 constraint
      ['Decision', 'Constraint', 'Task', 'Note'].forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.toLowerCase();
        select.appendChild(opt);
      });
      
      button = document.createElement('button');
      
      container.append(textarea, select, button);
    });

    it('adds an item via storage engine on click', async () => {
      const addSpy = vi.spyOn(engine, 'addItem').mockResolvedValue(true);
      
      setupManualInputUI('thread-123', { textarea, select, button });
      
      textarea.value = 'My manual note';
      select.value = 'task';
      button.dispatchEvent(new MouseEvent('click'));
      
      expect(addSpy).toHaveBeenCalledWith('thread-123', {
        tag: 'task',
        content: 'My manual note',
        source: 'manual'
      });
    });

    it('clears the textarea after successful save', async () => {
      vi.spyOn(engine, 'addItem').mockResolvedValue(true);
      
      setupManualInputUI('t1', { textarea, select, button });
      textarea.value = 'Clear me';
      button.dispatchEvent(new MouseEvent('click'));
      
      // Wait for promise resolution
      await new Promise(r => setTimeout(r, 0));
      expect(textarea.value).toBe('');
    });

    it('does not save if textarea is empty or whitespace (SPEC-13 constraint)', async () => {
      const addSpy = vi.spyOn(engine, 'addItem');
      
      setupManualInputUI('t1', { textarea, select, button });
      textarea.value = '   ';
      button.dispatchEvent(new MouseEvent('click'));
      
      expect(addSpy).not.toHaveBeenCalled();
    });
  });
});
