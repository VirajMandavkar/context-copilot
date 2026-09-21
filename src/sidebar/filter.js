// src/sidebar/filter.js — Sidebar Filter UI (SPEC-12b)

import { setFilterText } from './item-list.js';

/**
 * Binds the filter input element to the item list's filter state
 * and triggers a re-render when it changes.
 *
 * @param {HTMLInputElement} inputEl 
 * @param {Function} onRender 
 */
export function setupFilterUI(inputEl, onRender) {
  if (inputEl._ccFilterListener) {
    inputEl.removeEventListener('input', inputEl._ccFilterListener);
  }
  
  inputEl._ccFilterListener = (e) => {
    setFilterText(e.target.value);
    onRender();
  };
  
  inputEl.addEventListener('input', inputEl._ccFilterListener);
}
