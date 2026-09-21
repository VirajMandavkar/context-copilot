// tests/storage/manual-session.test.js — Manual session creation & polish tests
import { describe, it, expect, beforeEach } from 'vitest';
import { resetChromeStorageMock } from '../setup.js';
import {
  getSessionForThread,
  createAndLinkSessionForThread,
  addItem,
  toggleTaskCompletion,
  clearSessionItems,
  getSessionIndex
} from '../../src/storage/engine.js';
import { compileContext } from '../../src/injector/compiler.js';

describe('Manual Session Management & Polish', () => {
  beforeEach(() => {
    resetChromeStorageMock();
  });

  describe('getSessionForThread', () => {
    it('returns null sessionId and state for unmapped threads without creating sessions', async () => {
      const result = await getSessionForThread('unknown-thread-123');
      expect(result.sessionId).toBeNull();
      expect(result.state).toBeNull();

      // Verify no empty sessions were created in storage
      const index = await getSessionIndex();
      expect(Object.keys(index.sessions).length).toBe(0);
      expect(Object.keys(index.url_mappings).length).toBe(0);
    });

    it('returns existing session when thread has an active mapping', async () => {
      const { sessionId } = await createAndLinkSessionForThread('chat-1', 'https://chatgpt.com/c/chat-1', 'Project Alpha');
      
      const found = await getSessionForThread('chat-1');
      expect(found.sessionId).toBe(sessionId);
      expect(found.state).not.toBeNull();
      expect(found.state.session_id).toBe(sessionId);
    });
  });

  describe('createAndLinkSessionForThread', () => {
    it('creates a session and maps the threadId explicitly', async () => {
      const { sessionId, state } = await createAndLinkSessionForThread('thread-xyz', 'https://claude.ai/chat/thread-xyz', 'Claude Session');
      
      expect(sessionId).toBeDefined();
      expect(state.items).toEqual([]);

      const index = await getSessionIndex();
      expect(index.url_mappings['thread-xyz']).toBe(sessionId);
      expect(index.sessions[sessionId].name).toBe('Claude Session');
      expect(index.sessions[sessionId].origin_ai).toBe('Claude');
    });
  });

  describe('toggleTaskCompletion', () => {
    it('toggles task completed status and updates storage', async () => {
      const { sessionId } = await createAndLinkSessionForThread('thread-t1', 'https://chatgpt.com/c/1');
      const item = await addItem(sessionId, {
        tag: 'task',
        content: 'Review pull request',
        source: 'manual'
      });

      expect(item.completed).toBeUndefined();

      // Toggle to true
      const state1 = await toggleTaskCompletion(sessionId, item.id);
      expect(state1).toBe(true);

      // Verify in compiler
      const stateObj = await (await import('../../src/storage/engine.js')).getSessionState(sessionId);
      const compiled1 = compileContext(stateObj);
      expect(compiled1).toContain('- [x] Review pull request');

      // Toggle back to false
      const state2 = await toggleTaskCompletion(sessionId, item.id);
      expect(state2).toBe(false);

      const stateObj2 = await (await import('../../src/storage/engine.js')).getSessionState(sessionId);
      const compiled2 = compileContext(stateObj2);
      expect(compiled2).toContain('- [ ] Review pull request');
    });
  });

  describe('clearSessionItems', () => {
    it('clears all items in the session and resets item_count in index', async () => {
      const { sessionId } = await createAndLinkSessionForThread('thread-c1', 'https://chatgpt.com/c/1');
      await addItem(sessionId, { tag: 'note', content: 'Note 1', source: 'manual' });
      await addItem(sessionId, { tag: 'decision', content: 'Decision 1', source: 'manual' });

      let index = await getSessionIndex();
      expect(index.sessions[sessionId].item_count).toBe(2);

      const cleared = await clearSessionItems(sessionId);
      expect(cleared).toBe(true);

      const state = await (await import('../../src/storage/engine.js')).getSessionState(sessionId);
      expect(state.items).toEqual([]);

      index = await getSessionIndex();
      expect(index.sessions[sessionId].item_count).toBe(0);
    });
  });
});
