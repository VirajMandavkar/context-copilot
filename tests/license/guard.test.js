// tests/license/guard.test.js — Tests for Feature Gating & Tier Limits

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetChromeStorageMock } from '../setup.js';
import {
  canCreateSession,
  canAddItem,
  canUseGrouping,
  isGroupingAllowedSync,
  FREE_LIMITS
} from '../../src/license/guard.js';
import {
  activateLicense,
  deactivateLicense
} from '../../src/license/engine.js';

describe('Feature Gating & Guard Limits', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    resetChromeStorageMock();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true
      })
    });
    await deactivateLicense();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('canCreateSession', () => {
    it('allows 0 sessions on Free tier', async () => {
      const result = await canCreateSession(0);
      expect(result.allowed).toBe(true);
    });

    it('blocks additional sessions beyond FREE_LIMITS.MAX_SESSIONS on Free tier', async () => {
      const result = await canCreateSession(FREE_LIMITS.MAX_SESSIONS);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Free tier is limited/i);
    });

    it('allows unlimited sessions for Pro users', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: { status: 'active' },
          instance: { id: 'inst-1' },
          meta: {}
        })
      });
      await activateLicense('PRO-KEY');

      const result = await canCreateSession(10);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('canAddItem', () => {
    it('allows adding items when under FREE_LIMITS.MAX_ITEMS on Free tier', async () => {
      const result = await canAddItem(FREE_LIMITS.MAX_ITEMS - 1);
      expect(result.allowed).toBe(true);
    });

    it('blocks adding items at or above FREE_LIMITS.MAX_ITEMS on Free tier', async () => {
      const result = await canAddItem(FREE_LIMITS.MAX_ITEMS);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/Free tier is limited/i);
    });

    it('allows unlimited items for Pro users', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: { status: 'active' },
          instance: { id: 'inst-1' },
          meta: {}
        })
      });
      await activateLicense('PRO-KEY');

      const result = await canAddItem(100);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('canUseGrouping & isGroupingAllowedSync', () => {
    it('blocks grouping on Free tier', async () => {
      const asyncResult = await canUseGrouping();
      expect(asyncResult.allowed).toBe(false);
      expect(asyncResult.reason).toMatch(/Pro feature/i);

      expect(isGroupingAllowedSync()).toBe(false);
    });

    it('allows grouping for Pro users', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: { status: 'active' },
          instance: { id: 'inst-1' },
          meta: {}
        })
      });
      await activateLicense('PRO-KEY');

      const asyncResult = await canUseGrouping();
      expect(asyncResult.allowed).toBe(true);
      expect(isGroupingAllowedSync()).toBe(true);
    });
  });
});
