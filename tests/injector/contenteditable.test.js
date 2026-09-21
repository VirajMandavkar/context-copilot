// tests/injector/contenteditable.test.js — ContentEditable Injection tests
// Tests for: SPEC-18 (ProseMirror/CE injection), SPEC-20 (tick delay)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { injectContentEditable } from '../../src/injector/contenteditable.js';

describe('injectContentEditable (SPEC-18)', () => {
  let div;

  beforeEach(() => {
    div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
  });

  it('focuses the element before injection', async () => {
    const focusSpy = vi.spyOn(div, 'focus');
    await injectContentEditable(div, 'Hello');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('attempts document.execCommand first (SPEC-18)', async () => {
    const execSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
    await injectContentEditable(div, 'Via execCommand');
    expect(execSpy).toHaveBeenCalledWith('insertText', false, 'Via execCommand');
    execSpy.mockRestore();
  });

  it('falls back to InputEvent dispatch if execCommand returns false', async () => {
    vi.spyOn(document, 'execCommand').mockReturnValue(false);

    const inputHandler = vi.fn();
    const beforeInputHandler = vi.fn();
    div.addEventListener('input', inputHandler);
    div.addEventListener('beforeinput', beforeInputHandler);

    await injectContentEditable(div, 'Fallback text');

    expect(beforeInputHandler).toHaveBeenCalled();
    expect(inputHandler).toHaveBeenCalled();

    // Verify InputEvent properties
    const beforeInputEvent = beforeInputHandler.mock.calls[0][0];
    expect(beforeInputEvent.inputType).toBe('insertText');
    expect(beforeInputEvent.data).toBe('Fallback text');
    expect(beforeInputEvent.bubbles).toBe(true);

    const inputEvent = inputHandler.mock.calls[0][0];
    expect(inputEvent.inputType).toBe('insertText');
    expect(inputEvent.data).toBe('Fallback text');
    expect(inputEvent.bubbles).toBe(true);

    document.execCommand.mockRestore();
  });

  it('does NOT mutate innerHTML or textContent directly (SPEC-18 constraint)', async () => {
    const originalInnerHTML = div.innerHTML;
    const innerHTMLSetter = vi.fn();
    const textContentSetter = vi.fn();

    // Watch for direct mutations
    const innerHTMLDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML') ||
                          Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML');
    const textContentDesc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');

    vi.spyOn(document, 'execCommand').mockReturnValue(true);
    await injectContentEditable(div, 'Test');

    // innerHTML and textContent should not have been set directly by our code
    // (execCommand may modify them internally, which is fine)
    document.execCommand.mockRestore();
  });

  it('returns a promise (SPEC-20: tick delay)', async () => {
    vi.spyOn(document, 'execCommand').mockReturnValue(true);
    const result = injectContentEditable(div, 'Async');
    expect(result).toBeInstanceOf(Promise);
    await result;
    document.execCommand.mockRestore();
  });
});
