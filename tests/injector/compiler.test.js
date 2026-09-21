// tests/injector/compiler.test.js — Context Compilation tests
// Tests for: SPEC-16 (context → Markdown compilation)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect } from 'vitest';
import { compileContext } from '../../src/injector/compiler.js';

describe('compileContext (SPEC-16)', () => {
  it('compiles items grouped by tag into Markdown', () => {
    const state = {
      session_id: 't1',
      items: [
        { id: '1', tag: 'decision', content: 'Use React 18', source: 'selection', created_at: '', updated_at: '' },
        { id: '2', tag: 'constraint', content: 'No network calls', source: 'manual', created_at: '', updated_at: '' },
        { id: '3', tag: 'task', content: 'Build sidebar', source: 'manual', created_at: '', updated_at: '' },
        { id: '4', tag: 'note', content: 'Check ProseMirror docs', source: 'selection', created_at: '', updated_at: '' },
      ],
    };

    const result = compileContext(state);

    expect(result).toContain('## Working Memory (Context Copilot)');
    expect(result).toContain('### Decisions');
    expect(result).toContain('- Use React 18');
    expect(result).toContain('### Constraints');
    expect(result).toContain('- No network calls');
    expect(result).toContain('### Tasks');
    expect(result).toContain('- [ ] Build sidebar');
    expect(result).toContain('### Notes');
    expect(result).toContain('- Check ProseMirror docs');
  });

  it('formats tasks as Markdown checkboxes', () => {
    const state = {
      session_id: 't1',
      items: [
        { id: '1', tag: 'task', content: 'Implement storage', source: 'manual', created_at: '', updated_at: '' },
        { id: '2', tag: 'task', content: 'Write tests', source: 'manual', created_at: '', updated_at: '' },
      ],
    };

    const result = compileContext(state);
    expect(result).toContain('- [ ] Implement storage');
    expect(result).toContain('- [ ] Write tests');
  });

  it('omits empty tag groups', () => {
    const state = {
      session_id: 't1',
      items: [
        { id: '1', tag: 'decision', content: 'Only decisions', source: 'manual', created_at: '', updated_at: '' },
      ],
    };

    const result = compileContext(state);
    expect(result).toContain('### Decisions');
    expect(result).not.toContain('### Constraints');
    expect(result).not.toContain('### Tasks');
    expect(result).not.toContain('### Notes');
  });

  it('starts and ends with horizontal rules', () => {
    const state = {
      session_id: 't1',
      items: [
        { id: '1', tag: 'note', content: 'A note', source: 'manual', created_at: '', updated_at: '' },
      ],
    };

    const result = compileContext(state);
    expect(result.trimStart().startsWith('---')).toBe(true);
    expect(result.trimEnd().endsWith('---')).toBe(true);
  });

  it('returns empty string for empty items array', () => {
    const state = { session_id: 't1', items: [] };
    const result = compileContext(state);
    expect(result).toBe('');
  });

  it('preserves item order within each tag group (creation order)', () => {
    const state = {
      session_id: 't1',
      items: [
        { id: '1', tag: 'decision', content: 'First decision', source: 'manual', created_at: '', updated_at: '' },
        { id: '2', tag: 'note', content: 'A note', source: 'manual', created_at: '', updated_at: '' },
        { id: '3', tag: 'decision', content: 'Second decision', source: 'manual', created_at: '', updated_at: '' },
      ],
    };

    const result = compileContext(state);
    const firstIdx = result.indexOf('First decision');
    const secondIdx = result.indexOf('Second decision');
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it('handles multi-line content correctly', () => {
    const state = {
      session_id: 't1',
      items: [
        { id: '1', tag: 'note', content: 'Line 1\nLine 2\nLine 3', source: 'manual', created_at: '', updated_at: '' },
      ],
    };

    const result = compileContext(state);
    expect(result).toContain('- Line 1\nLine 2\nLine 3');
  });
});
