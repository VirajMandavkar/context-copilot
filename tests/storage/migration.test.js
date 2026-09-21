import { describe, it, expect, beforeEach, vi } from 'vitest';
import { migrateV1toV2, getSessionIndex } from '../../src/storage/engine.js';

describe('V1 to V2 Storage Migration (SPEC-21)', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it('migrates a v1 thread index to v2 session index and rekeys states', async () => {
    // Setup legacy V1 data
    const v1Index = {
      version: 1,
      threads: {
        'old-thread-1': {
          url: 'https://chatgpt.com/c/old-thread-1',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-02T00:00:00.000Z',
          item_count: 2
        }
      }
    };
    const v1State = {
      thread_id: 'old-thread-1',
      items: [{ id: 'item-1', content: 'test', tag: 'note', source: 'manual' }]
    };

    await chrome.storage.local.set({
      'cc_thread_index': v1Index,
      'cc_thread:old-thread-1': v1State
    });

    // Run migration
    const migrated = await migrateV1toV2();
    expect(migrated).toBe(true);

    // Verify old keys are gone
    const raw = await chrome.storage.local.get(null);
    expect(raw['cc_thread_index']).toBeUndefined();
    expect(raw['cc_thread:old-thread-1']).toBeUndefined();

    // Verify new V2 schema
    expect(raw['cc_session_index']).toBeDefined();
    const v2Index = raw['cc_session_index'];
    expect(v2Index.version).toBe(2);
    
    // UUID should be generated for the session, mapped to old thread ID
    const sessionIds = Object.keys(v2Index.sessions);
    expect(sessionIds.length).toBe(1);
    const sid = sessionIds[0];
    
    expect(v2Index.url_mappings['old-thread-1']).toBe(sid);
    
    const sessionMeta = v2Index.sessions[sid];
    expect(sessionMeta.name).toBe('Recovered Session');
    expect(sessionMeta.origin_ai).toBe('ChatGPT'); // Derived from URL
    expect(sessionMeta.item_count).toBe(2);
    
    // Verify state was rekeyed
    const v2State = raw['cc_session:' + sid];
    expect(v2State).toBeDefined();
    expect(v2State.session_id).toBe(sid);
    expect(v2State.items[0].id).toBe('item-1');
  });

  it('does nothing if already on v2', async () => {
    await chrome.storage.local.set({
      'cc_session_index': { version: 2, sessions: {}, url_mappings: {} }
    });
    const migrated = await migrateV1toV2();
    expect(migrated).toBe(false);
  });
});
