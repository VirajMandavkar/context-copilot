# Context Copilot — MVP Specification

> **Version:** 0.1.0-draft
> **Status:** AWAITING APPROVAL
> **Last Updated:** 2026-09-17

---

## 1. Overview

Context Copilot is a Manifest V3 Chrome Extension that lets users capture, tag, curate, and manually inject conversational context into React-based web chat interfaces (ChatGPT, Claude, etc.). It operates entirely client-side with zero network calls.

---

## 2. Storage Schema (`chrome.storage.local`)

### 2.1 Top-Level Key Structure

Storage is keyed by `thread_id`. Each thread maps to a `ThreadState` object. An index key tracks known threads.

```
{
  "cc_thread_index": ThreadIndex,
  "cc_thread:<thread_id>": ThreadState
}
```

### 2.2 `ThreadIndex` Schema

```jsonc
// Key: "cc_thread_index"
{
  "version": 1,                          // Schema version for future migrations
  "threads": {
    "<thread_id>": {
      "url": "string",                   // Full URL where thread was first seen
      "title": "string | null",          // Optional human-readable label
      "created_at": "ISO8601",           // First access timestamp
      "updated_at": "ISO8601",           // Last modification timestamp
      "item_count": "number"             // Denormalized count for sidebar display
    }
  }
}
```

### 2.3 `ThreadState` Schema

```jsonc
// Key: "cc_thread:<thread_id>"
{
  "thread_id": "string",                 // Canonical thread identifier
  "items": [
    {
      "id": "string",                    // crypto.randomUUID()
      "tag": "decision" | "constraint" | "task" | "note",
      "content": "string",              // The captured or typed text
      "source": "selection" | "manual", // How the item was created
      "selection_context": {             // Optional, only for source:"selection"
        "preceding_text": "string",      // Up to 100 chars before selection
        "following_text": "string",      // Up to 100 chars after selection
        "selector_hint": "string | null" // CSS selector of nearest identifiable ancestor
      } | null,
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

### 2.4 `thread_id` Derivation

The `thread_id` is extracted from the current page URL using a deterministic rule set:

| Host Pattern            | Extraction Rule                                      | Example thread_id          |
|-------------------------|------------------------------------------------------|----------------------------|
| `chatgpt.com`           | Pathname segment: `/c/<id>` or `/g/<id>/c/<id>`      | `abc123def`                |
| `claude.ai`             | Pathname segment: `/chat/<id>`                        | `xyz-789-uuid`             |
| Fallback (any host)     | `SHA-256(origin + pathname + search)` truncated to 16 hex chars | `a1b2c3d4e5f67890`        |

---

## 3. Numbered Specifications (Pre/Post-Conditions)

### Storage Engine

**SPEC-1: Storage Initialization**
- **Pre:** Extension loads on a page matching a supported host pattern. No `cc_thread:<id>` key exists for the active `thread_id`.
- **Post:** A new `ThreadState` is created with `thread_id` set, `items: []`. The `cc_thread_index` is updated with the new thread entry. `created_at` and `updated_at` are set to `Date.now()` ISO string.
- **Invariant:** `cc_thread_index.threads[id].item_count` always equals `cc_thread:<id>.items.length`.

**SPEC-2: Item Addition**
- **Pre:** A valid `ThreadState` exists for the active `thread_id`. A new item object is provided with non-empty `content` (trimmed), a valid `tag`, and a `source` of `"selection"` or `"manual"`.
- **Post:** The item is appended to `ThreadState.items` with a fresh `crypto.randomUUID()` as `id`, `created_at` and `updated_at` set to current ISO timestamp. `ThreadState` is persisted via `chrome.storage.local.set()`. The index entry's `item_count` and `updated_at` are updated atomically in the same `.set()` call.
- **Invariant:** No two items within a `ThreadState` share the same `id`.

**SPEC-3: Item Editing**
- **Pre:** An item with the given `id` exists in the active `ThreadState`.
- **Post:** The item's `content` is replaced with the new non-empty trimmed value. `updated_at` is refreshed on both the item and the index entry.
- **Error:** If `id` is not found, the operation is a no-op and returns `false`.

**SPEC-4: Item Deletion**
- **Pre:** An item with the given `id` exists in the active `ThreadState`.
- **Post:** The item is removed from `items`. `item_count` in the index is decremented. `updated_at` is refreshed on the index entry.
- **Error:** If `id` is not found, the operation is a no-op and returns `false`.

**SPEC-5: SPA Navigation Detection**
- **Pre:** The content script is running on a supported host. The user navigates to a different chat thread via client-side routing (`pushState`/`replaceState`).
- **Post:** Within 500ms of the URL change, the extension detects the new `thread_id`, loads (or initializes) its `ThreadState`, and updates the sidebar UI.
- **Mechanism:** The background service worker listens on `chrome.webNavigation.onHistoryStateUpdated` and sends a message to the content script in the affected tab. The content script compares the new URL's `thread_id` to its cached value and reloads state if changed.
- **Fallback:** If `webNavigation` permission is unavailable, a `MutationObserver` on `document.body` polls `location.href` on each mutation batch, comparing against a cached value.

**SPEC-6: Cross-Context Reactivity**
- **Pre:** The sidebar UI is open and displaying items for thread `T`.
- **Post:** Any change to `cc_thread:T` from any extension context (e.g., background script, another content script instance) triggers `chrome.storage.onChanged`, and the sidebar re-renders within one animation frame.

---

### DOM Tooltip Module

**SPEC-7: Selection Capture**
- **Pre:** The user selects one or more characters of text on the page and releases the mouse button (`mouseup` event fires).
- **Post:** If `window.getSelection().toString().trim().length > 0`, a floating tooltip appears within 100ms, positioned near the selection's bounding rect. The tooltip contains tag buttons: "Decision", "Constraint", "Task", "Note".
- **Constraint:** The tooltip must not overflow the viewport. If the selection is near the bottom/right edge, the tooltip flips its anchor direction.

**SPEC-8: Tag Selection & Save**
- **Pre:** The tooltip is visible. The user clicks a tag button.
- **Post:** An item is created (per SPEC-2) with `tag` set to the clicked button's value, `content` set to the trimmed selection text, and `source: "selection"`. The tooltip is dismissed. The text selection is preserved (not cleared).

**SPEC-9: Tooltip Dismissal**
- **Pre:** The tooltip is visible.
- **Post:** The tooltip is removed from the DOM when any of: (a) the user clicks outside the tooltip, (b) the user presses `Escape`, (c) a new `mouseup` event fires with an empty or different selection.
- **Constraint:** Dismissal must not interfere with the host page's own click/mouseup handlers. The tooltip's event listeners use `{ capture: true }` only on the tooltip's own Shadow DOM root.

**SPEC-10: Tooltip Isolation**
- **Pre:** The tooltip is rendered on any host page.
- **Post:** The tooltip is rendered inside a Shadow DOM node (`mode: "closed"`) to prevent CSS leakage in either direction. The tooltip's styles are fully self-contained.

---

### Working Memory Sidebar UI

**SPEC-11: Sidebar Injection & Isolation**
- **Pre:** The extension's content script is active on the page.
- **Post:** A sidebar container (`<div id="cc-sidebar-host">`) is appended to `document.body`. Its internal UI is rendered inside a Shadow DOM (`mode: "closed"`). The sidebar is hidden by default and toggled via the extension's browser action icon click (`chrome.action.onClicked`) **or** keyboard shortcut (`Alt+Shift+C` / `MacCtrl+Shift+C` on macOS) via `chrome.commands.onCommand`.
- **Constraint:** The sidebar must not shift the host page's layout. It overlays with `position: fixed; right: 0; top: 0; z-index: 2147483647`.

**SPEC-12: Item Display**
- **Pre:** The sidebar is open and the active `ThreadState` has ≥1 items.
- **Post:** Items are displayed grouped by `tag`, in creation order within each group. Each item shows its `content` (truncated to 200 chars with "..." if longer), `tag` badge, and relative timestamp (e.g., "2m ago").

**SPEC-12b: Keyword Filter**
- **Pre:** The sidebar is open and the filter input is visible at the top of the item list (below the manual note entry, above the grouped items).
- **Post:** As the user types into the filter input, a case-insensitive substring match is performed against each item's `content` and `tag` fields. Non-matching items are hidden in real-time (no debounce needed for client-side filtering of ≤100 items). Matching substrings within visible item content are highlighted with a `<mark>` element. Clearing the filter restores all items.
- **Constraint:** Filtering is purely visual — it does not modify `ThreadState`. Empty groups (all items filtered out) have their group header hidden.

**SPEC-13: Inline Editing**
- **Pre:** The user clicks an item's content area in the sidebar.
- **Post:** The content area becomes an editable `<textarea>` pre-filled with the full `content`. On blur or `Enter` (without Shift), the edit is committed per SPEC-3. On `Escape`, the edit is discarded.

**SPEC-14: Item Deletion**
- **Pre:** The user clicks the delete (×) button on an item.
- **Post:** A confirmation is not required (MVP). The item is deleted per SPEC-4. The UI updates immediately (optimistic removal, rolled back if storage write fails).

**SPEC-15: Manual Note Entry**
- **Pre:** The sidebar is open.
- **Post:** A text input at the top of the sidebar allows the user to type a note and select a tag from a dropdown. On `Enter` or clicking "Add", the note is saved per SPEC-2 with `source: "manual"`.

---

### Prompt Injector

**SPEC-16: Context Compilation**
- **Pre:** The active `ThreadState` has ≥1 items. The user clicks the "Inject Context" button in the sidebar.
- **Post:** All items are compiled into a Markdown block with the following format:
  ```markdown
  ---
  ## Working Memory (Context Copilot)

  ### Decisions
  - Item content here
  - Another decision

  ### Constraints
  - Constraint text

  ### Tasks
  - [ ] Task text

  ### Notes
  - Note text
  ---
  ```
  Empty tag groups are omitted. Tasks are formatted as Markdown checkboxes.

**SPEC-17: Textarea Injection (React Controlled Input)**
- **Pre:** The target chat UI's active input element is a `<textarea>` (e.g., Claude legacy). The compiled Markdown string is ready.
- **Post:** The Markdown is written to the textarea's `value` property using the **native setter** from `HTMLTextAreaElement.prototype` (bypassing React's patched setter). React's internal `_valueTracker` is reset by setting `el._valueTracker.setValue('')`. A native `Event('input', { bubbles: true })` and `Event('change', { bubbles: true })` are dispatched on the element, causing React's `onChange` handler to fire and the host UI to recognize the new value (e.g., enabling the Send button).
- **Constraint:** The injector does NOT auto-submit. It does NOT simulate `Enter` keypresses. It does NOT click the Send button.
- **Error Recovery:** If `_valueTracker` does not exist on the element, skip the reset step and dispatch events anyway (graceful degradation).

**SPEC-18: ContentEditable Injection (ProseMirror / Rich Text)**
- **Pre:** The target chat UI's active input element is a `contenteditable` div (e.g., ChatGPT with ProseMirror). The compiled Markdown string is ready.
- **Post:** The element is focused. `document.execCommand('insertText', false, compiledMarkdown)` is called first, which triggers ProseMirror's internal transaction pipeline and correctly updates the editor's state model.
- **Fallback:** If `execCommand` returns `false` (deprecated/unsupported), dispatch `InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: compiledMarkdown })` followed by `InputEvent('input', { bubbles: true, inputType: 'insertText', data: compiledMarkdown })`.
- **Constraint:** The injector does NOT mutate `.innerHTML` or `.textContent` directly — this would bypass ProseMirror's state and be overwritten on next render.

**SPEC-19: Input Element Detection**
- **Pre:** The user clicks "Inject Context".
- **Post:** The injector scans the page for the active input element using this priority chain:
  1. `document.activeElement` if it is a `<textarea>` or has `contenteditable="true"`.
  2. Query selector: `textarea[data-id], div[contenteditable="true"][data-id]` (host-specific data attributes).
  3. Query selector: `#prompt-textarea` (ChatGPT), `div.ProseMirror[contenteditable]` (generic ProseMirror), `textarea` (generic fallback).
- **Error:** If no suitable element is found, show a non-blocking notification in the sidebar: "Could not find chat input. Click inside the chat box and try again."

**SPEC-20: Post-Injection Tick Delay**
- **Pre:** Text has been injected and events dispatched.
- **Post:** The injector awaits one macrotask (`setTimeout(resolve, 0)`) before considering the injection complete. This allows React 18's automatic batching to flush state updates, ensuring the host UI's Send button reflects the new content.

---

## 4. Event Dispatch — Technical Reference

### 4.1 Why Native Setters Are Required

React 17+ overrides the `.value` property on `<textarea>` and `<input>` elements. The overridden setter updates an internal `_valueTracker` that React uses to diff current vs. previous values. When React's `onChange` fires, it compares `node.value` against `tracker.getValue()`. If they match (because the patched setter updated both), React sees "no change" and swallows the event.

**Solution:** Use `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set` to call the *original* native setter, which updates the DOM's actual value without touching `_valueTracker`. Then manually reset the tracker so React sees a delta.

### 4.2 Why `execCommand` for ContentEditable

ProseMirror (used by ChatGPT) maintains an immutable internal state model. Direct DOM mutations (`.innerHTML`, `.textContent`) are invisible to ProseMirror and get overwritten on the next re-render. `document.execCommand('insertText')` triggers the browser's native input pipeline, which ProseMirror intercepts via its own `beforeinput` handler, creating a proper transaction that updates the internal state.

### 4.3 Event Bubbling Requirement

React 17+ attaches a single event listener on the React root container (not `document`). Events dispatched with `bubbles: false` never reach this listener. **All dispatched events MUST use `{ bubbles: true }`.**

### 4.4 React 18 Automatic Batching

React 18 batches state updates from native event handlers, `setTimeout`, and promises into a single render. After injecting text and dispatching events, we must yield one macrotask tick (`setTimeout(fn, 0)`) before any downstream action (like programmatic Send — which we do NOT do in MVP, but the tick ensures the host UI renders the updated state).

---

## 5. Manifest V3 Configuration

```jsonc
{
  "manifest_version": 3,
  "name": "Context Copilot",
  "version": "0.1.0",
  "description": "Capture, tag, and inject conversational context into AI chat interfaces.",
  "permissions": [
    "storage",
    "activeTab",
    "webNavigation"
  ],
  "action": {
    "default_title": "Toggle Context Copilot Sidebar"
    // No default_popup — clicking the icon toggles sidebar via message
  },
  "commands": {
    "toggle-sidebar": {
      "suggested_key": {
        "default": "Alt+Shift+C",
        "mac": "MacCtrl+Shift+C"
      },
      "description": "Toggle Context Copilot Sidebar"
    }
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*",
        "https://chat.openai.com/*",
        "https://claude.ai/*",
        "*://*/*"                      // DEV ONLY — see PRE-RELEASE BLOCKER below
      ],
      "js": ["content.js"],
      "css": [],                       // No injected CSS — all styles in Shadow DOM
      "run_at": "document_idle"
    }
  ]
}
```

> **⛔ PRE-RELEASE BLOCKER:** The `*://*/*` match pattern is approved for local development only. Before ANY Chrome Web Store submission, this MUST be replaced with explicit origin patterns (`https://chatgpt.com/*`, `https://claude.ai/*`) or converted to optional `host_permissions`. Broad matches trigger severe CWS manual review delays.

---

## 6. Architecture Boundaries

```
┌────────────────────────────────────────────────────────┐
│                    Background Service Worker            │
│  - webNavigation.onHistoryStateUpdated listener         │
│  - action.onClicked listener (toggle sidebar)           │
│  - Message router between popup/content scripts         │
└──────────────────┬─────────────────────────────────────┘
                   │ chrome.runtime.sendMessage /
                   │ chrome.tabs.sendMessage
┌──────────────────▼─────────────────────────────────────┐
│                    Content Script (content.js)          │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │  Tooltip Module  │  │  Sidebar Module               │ │
│  │  (Shadow DOM,    │  │  (Shadow DOM, closed)         │ │
│  │   closed)        │  │  - Item list grouped by tag   │ │
│  │  - mouseup       │  │  - Inline edit                │ │
│  │  - getSelection  │  │  - Manual note input          │ │
│  │  - Tag buttons   │  │  - "Inject Context" button    │ │
│  └────────┬────────┘  └──────────┬───────────────────┘ │
│           │                      │                      │
│  ┌────────▼──────────────────────▼───────────────────┐ │
│  │              Storage Engine                        │ │
│  │  - CRUD on ThreadState via chrome.storage.local    │ │
│  │  - thread_id derivation from URL                   │ │
│  │  - onChanged listener for cross-context sync       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │              Prompt Injector                       │ │
│  │  - Input element detection (SPEC-19)               │ │
│  │  - Textarea injection (SPEC-17)                    │ │
│  │  - ContentEditable injection (SPEC-18)             │ │
│  │  - Context compilation (SPEC-16)                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Explicit Non-Goals (MVP)

1. **No auto-submission.** The injector writes text but never clicks Send.
2. **No keyboard interception.** No hotkey capture on the host page.
3. **No network calls.** All data stays in `chrome.storage.local`.
4. **No cross-device sync.** `chrome.storage.sync` is out of scope.
5. **No custom tag creation.** Tags are fixed to: Decision, Constraint, Task, Note. The `"custom"` enum value has been intentionally removed from the schema (reintroduce in v0.2 with UI).
6. **No rich text editing** in the sidebar — plain text only.
7. **No undo/redo** for item edits.
