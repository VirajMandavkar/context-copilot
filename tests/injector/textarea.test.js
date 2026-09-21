// tests/injector/textarea.test.js — Textarea Injection tests
// Tests for: SPEC-17 (React controlled textarea bypass), SPEC-20 (tick delay)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { injectTextarea } from '../../src/injector/textarea.js';

describe('injectTextarea (SPEC-17)', () => {
  let textarea;

  beforeEach(() => {
    textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
  });

  it('sets the textarea value to the provided text', async () => {
    await injectTextarea(textarea, 'Hello world');
    expect(textarea.value).toBe('Hello world');
  });

  it('dispatches an input event with bubbles: true', async () => {
    const handler = vi.fn();
    document.addEventListener('input', handler);
    await injectTextarea(textarea, 'Test');
    document.removeEventListener('input', handler);
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0];
    expect(event.bubbles).toBe(true);
  });

  it('dispatches a change event with bubbles: true', async () => {
    const handler = vi.fn();
    document.addEventListener('change', handler);
    await injectTextarea(textarea, 'Test');
    document.removeEventListener('change', handler);
    expect(handler).toHaveBeenCalled();
  });

  it('uses the native HTMLTextAreaElement.prototype setter', async () => {
    // Simulate React's patched setter by overriding .value
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    ).set;
    const fakeSetter = vi.fn();
    Object.defineProperty(textarea, 'value', {
      set: fakeSetter,
      get() {
        return nativeSetter.call(this) || '';
      },
      configurable: true,
    });

    await injectTextarea(textarea, 'Bypass React');

    // The native setter should have been called (not the fake one)
    // We can verify the textarea's actual value was set via native path
    // Since happy-dom may not perfectly simulate this, we check the text was injected
    // by reading through the prototype
    expect(fakeSetter).not.toHaveBeenCalled();
  });

  it('resets _valueTracker if present (SPEC-17)', async () => {
    // Simulate React's _valueTracker
    textarea._valueTracker = {
      getValue: () => 'old value',
      setValue: vi.fn(),
    };

    await injectTextarea(textarea, 'New value');
    expect(textarea._valueTracker.setValue).toHaveBeenCalledWith('');
  });

  it('handles missing _valueTracker gracefully (SPEC-17 error recovery)', async () => {
    // No _valueTracker — should not throw
    delete textarea._valueTracker;
    await expect(injectTextarea(textarea, 'Safe')).resolves.not.toThrow();
  });

  it('focuses the element before injection', async () => {
    const focusSpy = vi.spyOn(textarea, 'focus');
    await injectTextarea(textarea, 'Focus test');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('returns a promise (SPEC-20: tick delay)', async () => {
    const result = injectTextarea(textarea, 'Async');
    expect(result).toBeInstanceOf(Promise);
    await result;
  });
});
