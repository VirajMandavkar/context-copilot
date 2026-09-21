// tests/storage/reorder-engine.test.js — Storage Engine Reorder & Drag-and-Drop tests
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  addItem,
  getSessionState,
  reorderItem
} from '../../src/storage/engine.js';
import { resetChromeStorageMock } from '../setup.js';

describe('Storage Engine reorderItem', () => {
  beforeEach(() => {
    resetChromeStorageMock();
  });

  it('reorders an item before a target item', async () => {
    const session = await createSession('Reorder Test');
    const sid = session.sessionId;

    const i1 = await addItem(sid, { tag: 'decision', content: 'Item 1', source: 'manual' });
    const i2 = await addItem(sid, { tag: 'decision', content: 'Item 2', source: 'manual' });
    const i3 = await addItem(sid, { tag: 'decision', content: 'Item 3', source: 'manual' });

    // Move Item 3 before Item 1
    const success = await reorderItem(sid, {
      sourceId: i3.id,
      targetId: i1.id,
      position: 'before'
    });

    expect(success).toBe(true);

    const state = await getSessionState(sid);
    expect(state.items.map(i => i.id)).toEqual([i3.id, i1.id, i2.id]);
  });

  it('reorders an item after a target item', async () => {
    const session = await createSession('Reorder Test');
    const sid = session.sessionId;

    const i1 = await addItem(sid, { tag: 'decision', content: 'Item 1', source: 'manual' });
    const i2 = await addItem(sid, { tag: 'decision', content: 'Item 2', source: 'manual' });
    const i3 = await addItem(sid, { tag: 'decision', content: 'Item 3', source: 'manual' });

    // Move Item 1 after Item 2
    const success = await reorderItem(sid, {
      sourceId: i1.id,
      targetId: i2.id,
      position: 'after'
    });

    expect(success).toBe(true);

    const state = await getSessionState(sid);
    expect(state.items.map(i => i.id)).toEqual([i2.id, i1.id, i3.id]);
  });

  it('moves an item to another group and reorders it', async () => {
    const session = await createSession('Reorder Test');
    const sid = session.sessionId;

    const i1 = await addItem(sid, { tag: 'decision', content: 'Frontend item', source: 'manual', group: 'Frontend' });
    const i2 = await addItem(sid, { tag: 'decision', content: 'Backend item', source: 'manual', group: 'Backend' });

    // Move i1 into Backend group after i2
    const success = await reorderItem(sid, {
      sourceId: i1.id,
      targetId: i2.id,
      position: 'after',
      targetGroup: 'Backend'
    });

    expect(success).toBe(true);

    const state = await getSessionState(sid);
    expect(state.items[1].id).toBe(i1.id);
    expect(state.items[1].group).toBe('Backend');
  });

  it('moves an item to a target group without targetId (appends to group)', async () => {
    const session = await createSession('Reorder Test');
    const sid = session.sessionId;

    const i1 = await addItem(sid, { tag: 'note', content: 'Note 1', source: 'manual' }); // ungrouped
    const i2 = await addItem(sid, { tag: 'task', content: 'Task 1', source: 'manual', group: 'Auth' });

    // Move i1 into Auth
    const success = await reorderItem(sid, {
      sourceId: i1.id,
      targetGroup: 'Auth'
    });

    expect(success).toBe(true);

    const state = await getSessionState(sid);
    const updated = state.items.find(i => i.id === i1.id);
    expect(updated.group).toBe('Auth');
  });

  it('moves an item to Ungrouped', async () => {
    const session = await createSession('Reorder Test');
    const sid = session.sessionId;

    const i1 = await addItem(sid, { tag: 'decision', content: 'Grouped item', source: 'manual', group: 'Frontend' });

    // Ungroup
    const success = await reorderItem(sid, {
      sourceId: i1.id,
      targetGroup: 'Ungrouped'
    });

    expect(success).toBe(true);

    const state = await getSessionState(sid);
    expect(state.items[0].group).toBeUndefined();
  });

  it('returns false if session or sourceId not found', async () => {
    const success1 = await reorderItem('nonexistent-session', { sourceId: 'abc' });
    expect(success1).toBe(false);

    const session = await createSession('Reorder Test');
    const success2 = await reorderItem(session.sessionId, { sourceId: 'nonexistent-item' });
    expect(success2).toBe(false);
  });
});
