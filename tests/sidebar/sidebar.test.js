// tests/sidebar/sidebar.test.js — Sidebar Container tests
// Tests for: SPEC-11 (Sidebar shell, toggle, isolation)
// TDD: These tests are written FIRST. [READ-ONLY]

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { injectSidebar, toggleSidebar, removeSidebar, isSidebarOpen } from '../../src/sidebar/sidebar.js';

describe('Sidebar Container (SPEC-11)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    removeSidebar();
  });

  it('injects a host element into the body on first toggle', () => {
    toggleSidebar();
    const host = document.getElementById('cc-sidebar-host');
    expect(host).not.toBeNull();
    expect(isSidebarOpen()).toBe(true);
  });

  it('uses a closed Shadow DOM for isolation (SPEC-11)', () => {
    toggleSidebar();
    const host = document.getElementById('cc-sidebar-host');
    // setup.js exposes this for testing even on closed roots
    expect(host.shadowRoot).toBeDefined();
    expect(host.shadowRoot).not.toBeNull();
  });

  it('toggles visibility on subsequent calls', () => {
    // Open
    toggleSidebar();
    expect(isSidebarOpen()).toBe(true);
    let host = document.getElementById('cc-sidebar-host');
    expect(host.style.display).not.toBe('none');

    // Close
    toggleSidebar();
    expect(isSidebarOpen()).toBe(false);
    expect(host.style.display).toBe('none');

    // Open again
    toggleSidebar();
    expect(isSidebarOpen()).toBe(true);
    expect(host.style.display).not.toBe('none');
  });

  it('injects the internal container and CSS into the shadow root', () => {
    toggleSidebar();
    const shadow = document.getElementById('cc-sidebar-host').shadowRoot;
    
    const style = shadow.querySelector('style');
    expect(style).not.toBeNull();
    
    const container = shadow.querySelector('.cc-sidebar');
    expect(container).not.toBeNull();
  });

  it('cleans up DOM when removeSidebar is called', () => {
    toggleSidebar();
    removeSidebar();
    expect(document.getElementById('cc-sidebar-host')).toBeNull();
    expect(isSidebarOpen()).toBe(false);
  });
});
