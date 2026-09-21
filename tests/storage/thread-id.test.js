// tests/storage/thread-id.test.js — Thread ID derivation tests
// Tests for: SPEC-1 §2.4 (thread_id extraction from URL)
// TDD: These tests are written FIRST. The implementation must make them pass.
// [READ-ONLY] — Do not edit tests to make them pass.

import { describe, it, expect } from 'vitest';
import { extractThreadId } from '../../src/storage/thread-id.js';

describe('extractThreadId', () => {
  // --- ChatGPT patterns (SPEC-1 §2.4, row 1) ---

  describe('ChatGPT URLs', () => {
    it('extracts thread ID from chatgpt.com/c/<id>', () => {
      const url = 'https://chatgpt.com/c/abc123def';
      expect(extractThreadId(url)).toBe('abc123def');
    });

    it('extracts thread ID from chatgpt.com/g/<gid>/c/<id>', () => {
      const url = 'https://chatgpt.com/g/g-abc123/c/xyz789';
      expect(extractThreadId(url)).toBe('xyz789');
    });

    it('extracts thread ID from chat.openai.com/c/<id> (legacy domain)', () => {
      const url = 'https://chat.openai.com/c/legacy-id-456';
      expect(extractThreadId(url)).toBe('legacy-id-456');
    });

    it('extracts thread ID from chatgpt.com/c/<id> with trailing slash', () => {
      const url = 'https://chatgpt.com/c/abc123def/';
      expect(extractThreadId(url)).toBe('abc123def');
    });

    it('extracts thread ID from chatgpt.com/c/<id> with query params', () => {
      const url = 'https://chatgpt.com/c/abc123def?model=gpt-4';
      expect(extractThreadId(url)).toBe('abc123def');
    });
  });

  // --- Claude patterns (SPEC-1 §2.4, row 2) ---

  describe('Claude URLs', () => {
    it('extracts thread ID from claude.ai/chat/<id>', () => {
      const url = 'https://claude.ai/chat/xyz-789-uuid';
      expect(extractThreadId(url)).toBe('xyz-789-uuid');
    });

    it('extracts thread ID from claude.ai/chat/<id> with trailing slash', () => {
      const url = 'https://claude.ai/chat/xyz-789-uuid/';
      expect(extractThreadId(url)).toBe('xyz-789-uuid');
    });

    it('extracts thread ID from claude.ai/chat/<id> with query params', () => {
      const url = 'https://claude.ai/chat/xyz-789-uuid?ref=sidebar';
      expect(extractThreadId(url)).toBe('xyz-789-uuid');
    });
  });

  // --- Fallback: SHA-256 hash (SPEC-1 §2.4, row 3) ---

  describe('Fallback (unknown hosts)', () => {
    it('returns a 16-char hex string for unknown URLs', async () => {
      const url = 'https://example.com/some/path';
      const result = await extractThreadId(url);
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });

    it('produces different IDs for different pathnames on the same origin', async () => {
      const url1 = 'https://example.com/chat/1';
      const url2 = 'https://example.com/chat/2';
      const id1 = await extractThreadId(url1);
      const id2 = await extractThreadId(url2);
      expect(id1).not.toBe(id2);
    });

    it('produces different IDs for same pathname but different query params', async () => {
      // User decision: include search params in hash
      const url1 = 'https://example.com/chat?chatId=aaa';
      const url2 = 'https://example.com/chat?chatId=bbb';
      const id1 = await extractThreadId(url1);
      const id2 = await extractThreadId(url2);
      expect(id1).not.toBe(id2);
    });

    it('produces the same ID for identical URLs', async () => {
      const url = 'https://example.com/app?thread=123';
      const id1 = await extractThreadId(url);
      const id2 = await extractThreadId(url);
      expect(id1).toBe(id2);
    });

    it('produces different IDs for different origins with same path', async () => {
      const url1 = 'https://app1.com/chat';
      const url2 = 'https://app2.com/chat';
      const id1 = await extractThreadId(url1);
      const id2 = await extractThreadId(url2);
      expect(id1).not.toBe(id2);
    });
  });

  // --- Edge cases ---

  describe('Edge cases', () => {
    it('handles chatgpt.com root URL (no conversation) with fallback', async () => {
      const url = 'https://chatgpt.com/';
      // Root URL has no /c/<id> segment, should fallback to hash
      const result = await extractThreadId(url);
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });

    it('handles claude.ai root URL (no conversation) with fallback', async () => {
      const url = 'https://claude.ai/';
      // Root URL has no /chat/<id> segment, should fallback to hash
      const result = await extractThreadId(url);
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });

    it('handles claude.ai/chat (no ID segment) with fallback', async () => {
      const url = 'https://claude.ai/chat';
      const result = await extractThreadId(url);
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });
  });
});
