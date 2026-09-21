import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSessionIndex,
  getSessionState,
  initSessionForThread,
  addItem,
  editItem,
  deleteItem,
  deleteSession
} from '../../src/storage/engine.js';
import { resetChromeStorageMock } from '../setup.js';

describe('Storage Engine V2 (SPEC-1 to SPEC-4, SPEC-21)', () => {
  beforeEach(() => {
    resetChromeStorageMock();
  });

  describe('initSessionForThread (SPEC-1)', () => {
    it('creates a new session if URL is untracked', async () => {
      const { sessionId, state } = await initSessionForThread('thread-123', 'https://chatgpt.com/c/thread-123');
      expect(sessionId).toBeDefined();
      expect(state.items).toEqual([]);

      const index = await getSessionIndex();
      expect(index.url_mappings['thread-123']).toBe(sessionId);
      
      const sessionMeta = index.sessions[sessionId];
      expect(sessionMeta.origin_ai).toBe('ChatGPT');
      expect(sessionMeta.item_count).toBe(0);
    });

    it('returns existing session if URL is already mapped', async () => {
      const { sessionId: s1 } = await initSessionForThread('thread-123', 'https://chatgpt.com/c/thread-123');
      const { sessionId: s2 } = await initSessionForThread('thread-123', 'https://chatgpt.com/c/thread-123');
      expect(s1).toBe(s2);
    });
  });

  describe('addItem (SPEC-2)', () => {
    it('appends an item and updates the index', async () => {
      const { sessionId } = await initSessionForThread('t1', 'https://claude.ai/chat/t1');
      const item = await addItem(sessionId, {
        tag: 'note',
        content: 'hello',
        source: 'manual'
      });
      
      expect(item.id).toBeDefined();
      expect(item.content).toBe('hello');
      
      const state = await getSessionState(sessionId);
      expect(state.items.length).toBe(1);
      
      const index = await getSessionIndex();
      expect(index.sessions[sessionId].item_count).toBe(1);
    });
    
    it('rejects invalid tag', async () => {
      const { sessionId } = await initSessionForThread('t1', 'https://claude.ai/chat/t1');
      await expect(addItem(sessionId, { tag: 'bad', content: 'test', source: 'manual' })).rejects.toThrow();
    });
  });

  describe('editItem (SPEC-3)', () => {
    it('updates item content', async () => {
      const { sessionId } = await initSessionForThread('t1', 'https://claude.ai/chat/t1');
      const item = await addItem(sessionId, { tag: 'note', content: 'hello', source: 'manual' });
      
      const success = await editItem(sessionId, item.id, 'world');
      expect(success).toBe(true);
      
      const state = await getSessionState(sessionId);
      expect(state.items[0].content).toBe('world');
    });
  });

  describe('deleteItem (SPEC-4)', () => {
    it('removes item and decrements count', async () => {
      const { sessionId } = await initSessionForThread('t1', 'https://claude.ai/chat/t1');
      const item = await addItem(sessionId, { tag: 'note', content: 'hello', source: 'manual' });
      
      const success = await deleteItem(sessionId, item.id);
      expect(success).toBe(true);
      
      const state = await getSessionState(sessionId);
      expect(state.items.length).toBe(0);
      
      const index = await getSessionIndex();
      expect(index.sessions[sessionId].item_count).toBe(0);
    });
  });

  describe('deleteSession (SPEC-21)', () => {
    it('deletes the session, its state, and cleans up mappings', async () => {
      const { sessionId } = await initSessionForThread('t2', 'https://claude.ai/chat/t2');
      await addItem(sessionId, { tag: 'note', content: 'hello', source: 'manual' });
      
      const success = await deleteSession(sessionId);
      expect(success).toBe(true);
      
      const state = await getSessionState(sessionId);
      expect(state).toBeNull();
      
      const index = await getSessionIndex();
      expect(index.sessions[sessionId]).toBeUndefined();
      expect(index.url_mappings['t2']).toBeUndefined();
    });
  });
});
