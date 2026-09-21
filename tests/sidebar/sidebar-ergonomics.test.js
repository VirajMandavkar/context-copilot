// tests/sidebar/sidebar-ergonomics.test.js — Sidebar Ergonomics & Keyboard Tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  injectSidebar,
  toggleSidebar,
  openSidebar,
  closeSidebar,
  removeSidebar,
  isSidebarOpen,
  onSidebarToggle,
} from '../../src/sidebar/sidebar.js';

describe('Sidebar Ergonomics & Keyboard Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    removeSidebar();
  });

  afterEach(() => {
    removeSidebar();
  });

  it('includes slide-in keyframe animation in CSS', () => {
    toggleSidebar();
    const shadow = document.getElementById('cc-sidebar-host').shadowRoot;
    const style = shadow.querySelector('style');
    expect(style.textContent).toContain('cc-slide-in');
    expect(style.textContent).toContain('cubic-bezier');
  });

  it('notifies onSidebarToggle listeners when toggled, opened, or closed', () => {
    const listener = vi.fn();
    const unsubscribe = onSidebarToggle(listener);

    openSidebar();
    expect(listener).toHaveBeenCalledWith(true);

    closeSidebar();
    expect(listener).toHaveBeenCalledWith(false);

    toggleSidebar();
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    toggleSidebar();
    // Should not have been called after unsubscribe
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('closes sidebar when Escape key is pressed inside sidebar container', () => {
    openSidebar();
    expect(isSidebarOpen()).toBe(true);

    const shadow = document.getElementById('cc-sidebar-host').shadowRoot;
    const container = shadow.querySelector('.cc-sidebar');

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(isSidebarOpen()).toBe(false);
    const host = document.getElementById('cc-sidebar-host');
    expect(host.style.display).toBe('none');
  });
});
