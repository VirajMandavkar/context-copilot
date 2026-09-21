// tests/storage/reactivity.test.js — Cross-context reactivity tests
// Tests for: SPEC-6 (Storage changes trigger UI re-renders)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { _store, _onChangedListeners, resetChromeStorageMock } from '../setup.js';
import { startStorageReactivity, stopStorageReactivity } from '../../src/storage/reactivity.js';

describe('Storage Reactivity (SPEC-6)', () => {
  let callback;

  beforeEach(() => {
    resetChromeStorageMock();
    callback = vi.fn();
  });

  afterEach(() => {
    stopStorageReactivity();
  });

  it('triggers callback when the active session state changes', async () => {
    startStorageReactivity('thread-123', callback);
    
    // Simulate a storage change for the active thread
    const changes = {
      'cc_session:thread-123': {
        oldValue: { session_id: 'thread-123', items: [] },
        newValue: { session_id: 'thread-123', items: [{ id: '1', content: 'test' }] }
      }
    };
    
    // Fire the onChanged listeners directly
    for (const listener of _onChangedListeners) {
      listener(changes, 'local');
    }
    
    expect(callback).toHaveBeenCalledWith(changes['cc_session:thread-123'].newValue);
  });

  it('does NOT trigger callback when a DIFFERENT session state changes', async () => {
    startStorageReactivity('thread-123', callback);
    
    const changes = {
      'cc_session:thread-456': {
        oldValue: null,
        newValue: { session_id: 'thread-456', items: [] }
      }
    };
    
    for (const listener of _onChangedListeners) {
      listener(changes, 'local');
    }
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('does NOT trigger callback when the index changes', async () => {
    startStorageReactivity('thread-123', callback);
    
    const changes = {
      'cc_session_index': {
        oldValue: {},
        newValue: { version: 2, sessions: {} }
      }
    };
    
    for (const listener of _onChangedListeners) {
      listener(changes, 'local');
    }
    
    expect(callback).not.toHaveBeenCalled();
  });
});
