// tests/license/license.test.js — Tests for Lemon Squeezy License Engine

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetChromeStorageMock } from '../setup.js';
import {
  activateLicense,
  validateLicense,
  deactivateLicense,
  getLicenseState,
  isProUser,
  isProUserSync,
  onLicenseChange,
  LICENSE_STORAGE_KEY
} from '../../src/license/engine.js';

describe('Lemon Squeezy License Engine', () => {
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

  describe('activateLicense', () => {
    it('returns error if license key is empty', async () => {
      const res = await activateLicense('');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cannot be empty/i);
    });

    it('successfully activates a valid license and stores state', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: {
            status: 'active',
            expires_at: '2027-01-01T00:00:00Z'
          },
          instance: { id: 'inst-123' },
          meta: {
            customer_email: 'founder@example.com',
            customer_name: 'Founder'
          }
        })
      });

      const res = await activateLicense('VALID-KEY-123');
      expect(res.success).toBe(true);
      expect(res.state.license_key).toBe('VALID-KEY-123');
      expect(res.state.status).toBe('active');
      expect(res.state.instance_id).toBe('inst-123');
      expect(res.state.customer_email).toBe('founder@example.com');

      const isPro = await isProUser();
      expect(isPro).toBe(true);
      expect(isProUserSync()).toBe(true);

      const stored = await chrome.storage.local.get([LICENSE_STORAGE_KEY]);
      expect(stored[LICENSE_STORAGE_KEY]?.license_key).toBe('VALID-KEY-123');
    });

    it('handles activation failure from API', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'License key has reached its activation limit.'
        })
      });

      const res = await activateLicense('MAXED-KEY');
      expect(res.success).toBe(false);
      expect(res.error).toBe('License key has reached its activation limit.');

      const isPro = await isProUser();
      expect(isPro).toBe(false);
    });

    it('handles network failure gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const res = await activateLicense('SOME-KEY');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/network error/i);
    });
  });

  describe('isProUser & isProUserSync', () => {
    it('returns false when no license exists', async () => {
      expect(await isProUser()).toBe(false);
      expect(isProUserSync()).toBe(false);
    });

    it('returns false when license is expired', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: {
            status: 'active',
            expires_at: '2020-01-01T00:00:00Z' // past date
          },
          instance: { id: 'inst-expired' },
          meta: {}
        })
      });

      await activateLicense('EXPIRED-KEY');
      expect(await isProUser()).toBe(false);
      expect(isProUserSync()).toBe(false);
    });
  });

  describe('validateLicense', () => {
    it('returns valid: false when no license is stored', async () => {
      const res = await validateLicense(true);
      expect(res.valid).toBe(false);
    });

    it('successfully validates an active license', async () => {
      // Setup active license
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: { status: 'active', expires_at: '2027-01-01T00:00:00Z' },
          instance: { id: 'inst-123' },
          meta: {}
        })
      });
      await activateLicense('KEY-1');

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          license_key: { status: 'active', expires_at: '2027-01-01T00:00:00Z' }
        })
      });

      const res = await validateLicense(true);
      expect(res.valid).toBe(true);
      expect(res.state.status).toBe('active');
    });

    it('updates status to expired if validation fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: { status: 'active', expires_at: '2027-01-01T00:00:00Z' },
          instance: { id: 'inst-123' },
          meta: {}
        })
      });
      await activateLicense('KEY-2');

      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: false
        })
      });

      const res = await validateLicense(true);
      expect(res.valid).toBe(false);
      expect(res.state.status).toBe('expired');
      expect(await isProUser()).toBe(false);
    });

    it('falls back to cached state when offline during validation', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: { status: 'active', expires_at: '2027-01-01T00:00:00Z' },
          instance: { id: 'inst-123' },
          meta: {}
        })
      });
      await activateLicense('KEY-3');

      // Network error during validation
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('Connection lost'));

      const res = await validateLicense(true);
      // Graceful offline fallback: keep cached active status
      expect(res.valid).toBe(true);
    });
  });

  describe('deactivateLicense and onLicenseChange', () => {
    it('notifies listeners when license is activated and deactivated', async () => {
      const listener = vi.fn();
      const unsub = onLicenseChange(listener);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          activated: true,
          license_key: { status: 'active' },
          instance: { id: 'inst-123' },
          meta: {}
        })
      });

      await activateLicense('KEY-4');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ license_key: 'KEY-4' }));

      await deactivateLicense();
      expect(listener).toHaveBeenCalledWith(null);
      expect(await isProUser()).toBe(false);

      unsub();
    });
  });
});
