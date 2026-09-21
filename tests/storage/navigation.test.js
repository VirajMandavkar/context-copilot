// tests/storage/navigation.test.js — SPA Navigation Detection tests
// Tests for: SPEC-5 (SPA navigation detection via webNavigation and MutationObserver)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { _messageListeners } from '../setup.js';
import { startNavigationTracker, stopNavigationTracker } from '../../src/storage/navigation.js';
import * as threadIdModule from '../../src/storage/thread-id.js';

describe('SPA Navigation Tracker (SPEC-5)', () => {
  let callback;
  let extractSpy;

  beforeEach(() => {
    callback = vi.fn();
    extractSpy = vi.spyOn(threadIdModule, 'extractThreadId').mockImplementation(async (url) => {
      if (url.includes('t1')) return 'thread-1';
      if (url.includes('t2')) return 'thread-2';
      return 'thread-unknown';
    });
    // Set initial URL
    Object.defineProperty(window, 'location', {
      value: new URL('https://chatgpt.com/c/t1'),
      configurable: true,
    });
  });

  afterEach(() => {
    stopNavigationTracker();
    extractSpy.mockRestore();
    _messageListeners.length = 0;
  });

  describe('Background Message Listener (webNavigation)', () => {
    it('triggers callback when CC_URL_CHANGED message is received with a new thread_id', async () => {
      await startNavigationTracker(callback);
      
      // Simulate background script sending message
      const messageHandler = _messageListeners[0];
      expect(messageHandler).toBeDefined();

      await messageHandler({ type: 'CC_URL_CHANGED', url: 'https://chatgpt.com/c/t2' });
      
      expect(callback).toHaveBeenCalledWith('thread-2');
    });

    it('does NOT trigger callback if thread_id has not changed', async () => {
      await startNavigationTracker(callback);
      callback.mockClear();
      
      const messageHandler = _messageListeners[0];
      
      // URL changed (e.g. hash added) but thread ID remains 't1'
      await messageHandler({ type: 'CC_URL_CHANGED', url: 'https://chatgpt.com/c/t1#section' });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('MutationObserver Fallback', () => {
    it('triggers callback when location.href changes and produces a new thread_id', async () => {
      await startNavigationTracker(callback);
      
      // Change the URL silently (like a pushState would)
      window.location.href = 'https://chatgpt.com/c/t2';
      
      // Trigger a DOM mutation to wake up the observer
      document.body.appendChild(document.createElement('div'));
      
      // Wait a tick for MutationObserver to fire
      await new Promise(resolve => setTimeout(resolve, 0));
      // Give the async extraction a moment to resolve
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(callback).toHaveBeenCalledWith('thread-2');
    });

    it('does NOT trigger callback for DOM mutations if URL is unchanged', async () => {
      await startNavigationTracker(callback);
      callback.mockClear();
      
      document.body.appendChild(document.createElement('div'));
      
      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
