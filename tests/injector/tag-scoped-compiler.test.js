// tests/injector/tag-scoped-compiler.test.js — Tests for tag-scoped compilation and title formatting

import { describe, it, expect } from 'vitest';
import { compileContext } from '../../src/injector/compiler.js';

describe('Tag-Scoped Compiler & Title Formatting', () => {
  const sampleState = {
    session_id: 's1',
    items: [
      {
        id: '1',
        tag: 'decision',
        title: 'Proxy Architecture',
        content: 'Use Go proxy for Anthropic ephemeral caching.',
        created_at: '2023-01-01',
      },
      {
        id: '2',
        tag: 'constraint',
        title: 'Network Limit',
        content: 'No external outbound requests outside VPC.',
        created_at: '2023-01-02',
      },
      {
        id: '3',
        tag: 'task',
        title: 'Build Reverse Proxy',
        content: 'Write Go HTTP server skeleton.',
        completed: true,
        created_at: '2023-01-03',
      },
      {
        id: '4',
        tag: 'note',
        content: 'A standard note without title.',
        created_at: '2023-01-04',
      },
    ],
  };

  it('compiles all items when tag is "all" or omitted', () => {
    const result = compileContext(sampleState);
    expect(result).toContain('### Decisions');
    expect(result).toContain('- **Proxy Architecture**: Use Go proxy for Anthropic ephemeral caching.');
    expect(result).toContain('### Constraints');
    expect(result).toContain('- **Network Limit**: No external outbound requests outside VPC.');
    expect(result).toContain('### Tasks');
    expect(result).toContain('- [x] **Build Reverse Proxy**: Write Go HTTP server skeleton.');
    expect(result).toContain('### Notes');
    expect(result).toContain('- A standard note without title.');
  });

  it('compiles ONLY decisions when tag is "decision"', () => {
    const result = compileContext(sampleState, { tag: 'decision' });
    expect(result).toContain('### Decisions');
    expect(result).toContain('Proxy Architecture');
    expect(result).not.toContain('### Constraints');
    expect(result).not.toContain('### Tasks');
    expect(result).not.toContain('### Notes');
  });

  it('compiles ONLY constraints when tag is "constraint"', () => {
    const result = compileContext(sampleState, { tag: 'constraint' });
    expect(result).toContain('### Constraints');
    expect(result).toContain('Network Limit');
    expect(result).not.toContain('### Decisions');
    expect(result).not.toContain('### Tasks');
    expect(result).not.toContain('### Notes');
  });

  it('compiles ONLY tasks when tag is "task"', () => {
    const result = compileContext(sampleState, { tag: 'task' });
    expect(result).toContain('### Tasks');
    expect(result).toContain('- [x] **Build Reverse Proxy**: Write Go HTTP server skeleton.');
    expect(result).not.toContain('### Decisions');
    expect(result).not.toContain('### Constraints');
  });

  it('returns empty string if scoped tag has no items', () => {
    const stateWithoutDecisions = {
      session_id: 's2',
      items: [{ id: '1', tag: 'note', content: 'hello' }],
    };
    const result = compileContext(stateWithoutDecisions, { tag: 'decision' });
    expect(result).toBe('');
  });
});
