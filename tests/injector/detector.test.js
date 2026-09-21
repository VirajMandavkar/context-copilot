// tests/injector/detector.test.js — Input Element Detection tests
// Tests for: SPEC-19 (priority chain input element finder)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findInputElement } from '../../src/injector/detector.js';

describe('findInputElement (SPEC-19)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // --- Priority 1: document.activeElement ---

  it('returns activeElement if it is a textarea', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    const result = findInputElement();
    expect(result).toBe(textarea);
  });

  it('returns activeElement if it is contenteditable', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();
    const result = findInputElement();
    expect(result).toBe(div);
  });

  it('ignores activeElement if it is document.body', () => {
    // Body is focused by default, should not be returned
    document.body.focus();
    const result = findInputElement();
    // Should fall through to query selectors or return null
    expect(result).not.toBe(document.body);
  });

  // --- Priority 2: data-id selectors ---

  it('finds textarea with data-id attribute', () => {
    const textarea = document.createElement('textarea');
    textarea.setAttribute('data-id', 'prompt');
    document.body.appendChild(textarea);
    const result = findInputElement();
    expect(result).toBe(textarea);
  });

  it('finds contenteditable div with data-id attribute', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.setAttribute('data-id', 'editor');
    document.body.appendChild(div);
    const result = findInputElement();
    expect(result).toBe(div);
  });

  // --- Priority 3: Well-known selectors ---

  it('finds ChatGPT input (#prompt-textarea)', () => {
    const div = document.createElement('div');
    div.id = 'prompt-textarea';
    div.contentEditable = 'true';
    document.body.appendChild(div);
    const result = findInputElement();
    expect(result).toBe(div);
  });

  it('finds ProseMirror contenteditable', () => {
    const div = document.createElement('div');
    div.classList.add('ProseMirror');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    const result = findInputElement();
    expect(result).toBe(div);
  });

  it('finds generic textarea as last resort', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const result = findInputElement();
    expect(result).toBe(textarea);
  });

  // --- No match ---

  it('returns null when no suitable element is found', () => {
    // Empty body
    const result = findInputElement();
    expect(result).toBeNull();
  });

  // --- Priority order ---

  it('prefers activeElement over query selectors', () => {
    const textarea1 = document.createElement('textarea');
    textarea1.setAttribute('data-id', 'prompt');
    document.body.appendChild(textarea1);

    const textarea2 = document.createElement('textarea');
    document.body.appendChild(textarea2);
    textarea2.focus();

    const result = findInputElement();
    expect(result).toBe(textarea2); // activeElement takes priority
  });
});
