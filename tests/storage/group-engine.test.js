// tests/storage/group-engine.test.js — Storage Engine Group Management tests
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGroup,
  renameGroup,
  deleteGroup,
  addItem,
  editItem,
  createSession,
  getSessionState
} from '../../src/storage/engine.js';
import { resetChromeStorageMock } from '../setup.js';

describe('Storage Engine Group Management', () => {
  beforeEach(() => {
    resetChromeStorageMock();
  });

  it('initializes groups array when creating a session', async () => {
    const session = await createSession('Project Alpha');
    expect(session.state.groups).toEqual([]);
  });

  it('creates a new group and prevents duplicates (case-insensitive)', async () => {
    const session = await createSession('Project Alpha');
    const sid = session.sessionId;

    const group = await createGroup(sid, 'Frontend UI');
    expect(group).toBe('Frontend UI');

    const state1 = await getSessionState(sid);
    expect(state1.groups).toEqual(['Frontend UI']);

    await expect(createGroup(sid, 'frontend ui')).rejects.toThrow('already exists');
    await expect(createGroup(sid, 'Frontend UI')).rejects.toThrow('already exists');
  });

  it('rejects reserved group names', async () => {
    const session = await createSession('Project Alpha');
    const sid = session.sessionId;

    await expect(createGroup(sid, 'all')).rejects.toThrow('Reserved');
    await expect(createGroup(sid, 'All Groups')).rejects.toThrow('Reserved');
    await expect(createGroup(sid, 'Ungrouped')).rejects.toThrow('Reserved');
    await expect(createGroup(sid, '   ')).rejects.toThrow('cannot be empty');
  });

  it('renames a group and updates item.group on all matching items', async () => {
    const session = await createSession('Project Alpha');
    const sid = session.sessionId;

    await createGroup(sid, 'Go Proxy');
    await addItem(sid, { tag: 'decision', content: 'Use Gin', source: 'manual', group: 'Go Proxy' });
    await addItem(sid, { tag: 'task', content: 'Write handler', source: 'manual', group: 'Go Proxy' });
    await addItem(sid, { tag: 'note', content: 'General note', source: 'manual' });

    await renameGroup(sid, 'Go Proxy', 'Backend Go');

    const state = await getSessionState(sid);
    expect(state.groups).toEqual(['Backend Go']);
    expect(state.items[0].group).toBe('Backend Go');
    expect(state.items[1].group).toBe('Backend Go');
    expect(state.items[2].group).toBeUndefined();
  });

  it('deletes a group and ungroups items by default (deleteItems: false)', async () => {
    const session = await createSession('Project Alpha');
    const sid = session.sessionId;

    await createGroup(sid, 'Auth');
    await addItem(sid, { tag: 'decision', content: 'Use JWT', source: 'manual', group: 'Auth' });

    await deleteGroup(sid, 'Auth', { deleteItems: false });

    const state = await getSessionState(sid);
    expect(state.groups).toEqual([]);
    expect(state.items.length).toBe(1);
    expect(state.items[0].group).toBeUndefined();
  });

  it('deletes a group and removes items when deleteItems: true', async () => {
    const session = await createSession('Project Alpha');
    const sid = session.sessionId;

    await createGroup(sid, 'Auth');
    await addItem(sid, { tag: 'decision', content: 'Use JWT', source: 'manual', group: 'Auth' });
    await addItem(sid, { tag: 'note', content: 'Keep this note', source: 'manual' });

    await deleteGroup(sid, 'Auth', { deleteItems: true });

    const state = await getSessionState(sid);
    expect(state.groups).toEqual([]);
    expect(state.items.length).toBe(1);
    expect(state.items[0].content).toBe('Keep this note');
  });

  it('automatically registers new group in session.groups when adding an item with group', async () => {
    const session = await createSession('Project Alpha');
    const sid = session.sessionId;

    await addItem(sid, { tag: 'task', content: 'Fix bug', source: 'manual', group: 'Database' });

    const state = await getSessionState(sid);
    expect(state.groups).toContain('Database');
    expect(state.items[0].group).toBe('Database');
  });

  it('allows moving an item to a new group or ungrouping via editItem', async () => {
    const session = await createSession('Project Alpha');
    const sid = session.sessionId;

    const item = await addItem(sid, { tag: 'task', content: 'Fix bug', source: 'manual', group: 'Database' });

    // Move to Redis
    await editItem(sid, item.id, 'Fix redis bug', undefined, 'Redis');
    let state = await getSessionState(sid);
    expect(state.groups).toContain('Redis');
    expect(state.items[0].group).toBe('Redis');

    // Ungroup
    await editItem(sid, item.id, 'Fix redis bug', undefined, '');
    state = await getSessionState(sid);
    expect(state.items[0].group).toBeUndefined();
  });
});
