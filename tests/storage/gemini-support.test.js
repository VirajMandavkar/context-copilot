import { describe, it, expect } from 'vitest';
import { extractThreadId } from '../../src/storage/thread-id.js';
import { findInputElement } from '../../src/injector/detector.js';

describe('Gemini & Universal AI Support', () => {
  it('extracts thread ID from gemini.google.com/app/<id>', () => {
    const url = 'https://gemini.google.com/app/e5b392e4bfe25905';
    expect(extractThreadId(url)).toBe('e5b392e4bfe25905');
  });

  it('detects Gemini rich-textarea and ql-editor input elements', () => {
    document.body.innerHTML = `
      <rich-textarea>
        <div class="ql-editor textarea" contenteditable="true" role="textbox"></div>
      </rich-textarea>
    `;
    const found = findInputElement();
    expect(found).not.toBeNull();
    expect(found.classList.contains('ql-editor')).toBe(true);
    document.body.innerHTML = '';
  });
});
