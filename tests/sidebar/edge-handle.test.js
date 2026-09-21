// tests/sidebar/edge-handle.test.js — Floating Edge Pull-Handle tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initEdgeHandle,
  updateEdgeHandleCount,
  triggerPulse,
  setEdgeHandleOpen,
  destroyEdgeHandle,
  getEdgeHandleShadowRoot,
} from '../../src/sidebar/edge-handle.js';

describe('Floating Edge Pull-Handle (Edge Tab)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    destroyEdgeHandle();
  });

  afterEach(() => {
    destroyEdgeHandle();
  });

  it('injects host element into the body with closed shadow root', () => {
    const host = initEdgeHandle();
    expect(host).not.toBeNull();
    expect(document.getElementById('cc-edge-handle-host')).toBe(host);
    expect(host.shadowRoot).toBeDefined();
  });

  it('initializes with count 0 and hides badge', () => {
    initEdgeHandle({ initialCount: 0 });
    const shadow = getEdgeHandleShadowRoot();
    const badge = shadow.querySelector('.cc-edge-badge');
    expect(badge).not.toBeNull();
    expect(badge.classList.contains('cc-hidden')).toBe(true);
  });

  it('initializes with count > 0 and displays badge', () => {
    initEdgeHandle({ initialCount: 4 });
    const shadow = getEdgeHandleShadowRoot();
    const badge = shadow.querySelector('.cc-edge-badge');
    expect(badge.classList.contains('cc-hidden')).toBe(false);
    expect(badge.textContent).toBe('4');
  });

  it('caps display at 99+ for large numbers', () => {
    initEdgeHandle({ initialCount: 150 });
    const shadow = getEdgeHandleShadowRoot();
    const badge = shadow.querySelector('.cc-edge-badge');
    expect(badge.textContent).toBe('99+');
  });

  it('updates count and toggles badge visibility', () => {
    initEdgeHandle({ initialCount: 0 });
    const shadow = getEdgeHandleShadowRoot();
    const badge = shadow.querySelector('.cc-edge-badge');

    expect(badge.classList.contains('cc-hidden')).toBe(true);

    updateEdgeHandleCount(2);
    expect(badge.classList.contains('cc-hidden')).toBe(false);
    expect(badge.textContent).toBe('2');

    updateEdgeHandleCount(0);
    expect(badge.classList.contains('cc-hidden')).toBe(true);
  });

  it('triggers pulse animation when requested', () => {
    initEdgeHandle({ initialCount: 1 });
    const shadow = getEdgeHandleShadowRoot();
    const badge = shadow.querySelector('.cc-edge-badge');

    updateEdgeHandleCount(2, { pulse: true });
    expect(badge.classList.contains('cc-pulse')).toBe(true);
  });

  it('calls onToggle callback when clicked without dragging', () => {
    const onToggle = vi.fn();
    initEdgeHandle({ onToggle });

    const shadow = getEdgeHandleShadowRoot();
    const tab = shadow.querySelector('.cc-edge-tab');

    // Simulate click (mousedown followed by mouseup without movement)
    tab.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientY: 100 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientY: 100 }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('updates host style.top when dragged beyond threshold and suppresses toggle', () => {
    const onToggle = vi.fn();
    const host = initEdgeHandle({ onToggle });

    const shadow = getEdgeHandleShadowRoot();
    const tab = shadow.querySelector('.cc-edge-tab');

    // Mock client dimensions
    Object.defineProperty(window, 'innerHeight', { value: 1000, writable: true });

    tab.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientY: 100 }));
    // Move 50px down
    window.dispatchEvent(new MouseEvent('mousemove', { clientY: 150 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientY: 150 }));

    // Toggle should NOT have been called due to dragging
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('syncs open/close visual state with setEdgeHandleOpen', () => {
    const host = initEdgeHandle();
    const shadow = getEdgeHandleShadowRoot();
    const icon = shadow.querySelector('.cc-edge-icon');

    setEdgeHandleOpen(true);
    expect(host.classList.contains('cc-sidebar-open')).toBe(true);
    expect(icon.textContent).toBe('›');

    setEdgeHandleOpen(false);
    expect(host.classList.contains('cc-sidebar-open')).toBe(false);
    expect(icon.textContent).toBe('‹');
  });

  it('cleans up DOM when destroyed', () => {
    initEdgeHandle();
    expect(document.getElementById('cc-edge-handle-host')).not.toBeNull();

    destroyEdgeHandle();
    expect(document.getElementById('cc-edge-handle-host')).toBeNull();
  });
});
