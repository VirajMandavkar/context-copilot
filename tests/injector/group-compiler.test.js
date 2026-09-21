// tests/injector/group-compiler.test.js — Context Compilation with Grouping tests
import { describe, it, expect } from 'vitest';
import { compileContext } from '../../src/injector/compiler.js';

describe('compileContext with Grouping', () => {
  const sampleState = {
    session_id: 's1',
    groups: ['Frontend UI', 'Backend Go'],
    items: [
      { id: '1', tag: 'decision', title: 'React 18', content: 'Use concurrent features', group: 'Frontend UI', created_at: '2023-01-01' },
      { id: '2', tag: 'task', content: 'Build navbar', group: 'Frontend UI', created_at: '2023-01-02' },
      { id: '3', tag: 'decision', content: 'Use Gin router', group: 'Backend Go', created_at: '2023-01-03' },
      { id: '4', tag: 'constraint', content: 'Max payload 50MB', group: 'Backend Go', created_at: '2023-01-04' },
      { id: '5', tag: 'note', content: 'General project overview', created_at: '2023-01-05' } // Ungrouped
    ]
  };

  it('compiles only items for a specific group when options.group is set', () => {
    const result = compileContext(sampleState, { group: 'Frontend UI' });

    expect(result).toContain('## Working Memory (Context Copilot) — Frontend UI');
    expect(result).toContain('### Decisions');
    expect(result).toContain('**React 18**: Use concurrent features');
    expect(result).toContain('### Tasks');
    expect(result).toContain('- [ ] Build navbar');

    // Should not contain Backend Go or Ungrouped items
    expect(result).not.toContain('Use Gin router');
    expect(result).not.toContain('General project overview');
  });

  it('compiles only items for Ungrouped when options.group is "ungrouped"', () => {
    const result = compileContext(sampleState, { group: 'ungrouped' });

    expect(result).toContain('## Working Memory (Context Copilot) — Ungrouped');
    expect(result).toContain('### Notes');
    expect(result).toContain('- General project overview');

    expect(result).not.toContain('React 18');
    expect(result).not.toContain('Use Gin router');
  });

  it('combines group filtering with tag filtering', () => {
    const result = compileContext(sampleState, { group: 'Frontend UI', tag: 'decision' });

    expect(result).toContain('## Working Memory (Context Copilot) — Frontend UI');
    expect(result).toContain('### Decisions');
    expect(result).toContain('**React 18**: Use concurrent features');
    expect(result).not.toContain('### Tasks');
    expect(result).not.toContain('Build navbar');
  });

  it('organizes items hierarchically under group headers when group is "all" and groups exist', () => {
    const result = compileContext(sampleState, { group: 'all' });

    expect(result).toContain('## Working Memory (Context Copilot)');
    expect(result).toContain('### Group: Frontend UI');
    expect(result).toContain('#### Decisions');
    expect(result).toContain('**React 18**: Use concurrent features');
    expect(result).toContain('#### Tasks');
    expect(result).toContain('- [ ] Build navbar');

    expect(result).toContain('### Group: Backend Go');
    expect(result).toContain('#### Decisions');
    expect(result).toContain('- Use Gin router');
    expect(result).toContain('#### Constraints');
    expect(result).toContain('- Max payload 50MB');

    expect(result).toContain('### Group: Ungrouped');
    expect(result).toContain('#### Notes');
    expect(result).toContain('- General project overview');
  });

  it('omits group sections that have no matching items when combined with tag filter on "all" groups', () => {
    const result = compileContext(sampleState, { group: 'all', tag: 'constraint' });

    expect(result).toContain('### Group: Backend Go');
    expect(result).toContain('#### Constraints');
    expect(result).toContain('- Max payload 50MB');

    // Frontend UI has no constraints, Ungrouped has no constraints
    expect(result).not.toContain('### Group: Frontend UI');
    expect(result).not.toContain('### Group: Ungrouped');
  });

  it('preserves flat formatting when no items in the session have a custom group', () => {
    const flatState = {
      session_id: 's2',
      groups: [],
      items: [
        { id: '1', tag: 'decision', content: 'Plain decision' },
        { id: '2', tag: 'note', content: 'Plain note' }
      ]
    };

    const result = compileContext(flatState, { group: 'all' });
    expect(result).toContain('### Decisions');
    expect(result).toContain('### Notes');
    expect(result).not.toContain('### Group:');
  });
});
