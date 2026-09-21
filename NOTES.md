# Context Copilot — Architecture Notes

> Living document. Updated throughout development.

---

## Session: 2026-09-17

### Key Architectural Decisions

1. **Shadow DOM (closed mode)** for both tooltip and sidebar to guarantee CSS/event isolation from host pages.

2. **SPA Detection Strategy:** Primary = `chrome.webNavigation.onHistoryStateUpdated` (requires `webNavigation` permission). Fallback = `MutationObserver` polling `location.href`. Chose NOT to monkey-patch `history.pushState` because content scripts run in an isolated world and cannot intercept page-world calls.

3. **React Injection — Two Code Paths:**
   - `<textarea>`: Native setter from `HTMLTextAreaElement.prototype` + `_valueTracker` reset + bubble `input`/`change` events.
   - `contenteditable`: `document.execCommand('insertText')` first (triggers ProseMirror transaction pipeline). Fallback to raw `InputEvent` dispatch if `execCommand` returns `false`.
   - NEVER mutate `.innerHTML`/`.textContent` on contenteditable — ProseMirror overwrites on next render.

4. **Storage Key Prefix:** All keys prefixed with `cc_` to avoid collisions with other extensions or host page scripts using chrome.storage.

5. **Thread Index Denormalization:** `item_count` stored in index to avoid loading full `ThreadState` just to show counts in a future thread-picker UI.

6. **No Framework for UI:** Vanilla JS + DOM APIs inside Shadow DOM. No React/Preact/Lit dependency for MVP. Keeps the bundle tiny and avoids framework-on-framework conflicts.

### Active Constraints

- `chrome.storage.local` default 10MB. MVP does NOT request `unlimitedStorage`.
- `storage.session` inaccessible from content scripts by default — not using it.
- `_valueTracker` presence is not guaranteed (non-React textareas) — graceful degradation required.
- `document.execCommand` is deprecated but still functional in all major browsers as of 2026. The InputEvent fallback is the forward-compatible path.

### Resolved Decisions (2026-09-17, Post-Review)

1. **Test Runner:** Vitest (approved). ESM-native, fast, `happy-dom` for DOM mocking.
2. **Tag Enum:** Dropped `"custom"` from schema. Strict `["decision", "constraint", "task", "note"]`.
3. **Thread ID Fallback Hash:** Now `SHA-256(origin + pathname + search)` — includes query params for query-param-based chat UIs.
4. **Keyboard Shortcut:** Added `chrome.commands` with `Alt+Shift+C` / `MacCtrl+Shift+C`. Background listens on `chrome.commands.onCommand`.
5. **Keyword Filter:** Added SPEC-12b — client-side substring filter with `<mark>` highlighting in sidebar.
6. **Selection Context:** Added `selection_context` field to item schema (preceding/following text + CSS selector hint) for forward-compatible origin anchoring.
7. **`document.execCommand` dual-path:** Approved. Try `execCommand('insertText')` first, fallback to `InputEvent` dispatch.

### Pre-Release Blockers

- ⛔ **Content Script Match Pattern:** `*://*/*` MUST be replaced with explicit origins before CWS submission. Broad matches trigger severe manual review delays.

### Unresolved / Flagged

- **Test runner installation:** Vitest approved but `npm install` not yet run. Must present package list for human lockfile review per slopsquatting guard.
- **`selection_context` capture:** Schema field added but no UI for "scroll to source" in MVP. Capture logic records data silently for v0.2.

### Research Findings (Distilled)

- `chrome.storage.onChanged` fires in the SAME context that wrote — useful for single content-script reactivity.
- Content scripts can access `chrome.storage.local` directly with `"storage"` permission — no background relay needed for reads/writes.
- React 18 auto-batching: always yield one macrotask tick after injection before asserting UI state.
