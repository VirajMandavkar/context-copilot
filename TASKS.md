# Context Copilot — Task List

> **Status:** AWAITING SPEC APPROVAL
> Execution begins only after human approval of `SPEC.md`.

---

## Phase 1: Project Scaffolding ✅

- [x] **T-1:** Initialize project directory structure and `manifest.json` (SPEC §5)
- [x] **T-2:** Set up test infrastructure (Vitest + happy-dom, chrome API mocks in tests/setup.js)
- [x] **T-3:** Create `NOTES.md` with architectural decisions log

## Phase 2: Storage Engine

- [x] **T-4:** Implement `thread_id` derivation from URL (SPEC-1, §2.4)
  - [x] T-4.1: Write failing tests for each host pattern + fallback SHA-256
  - [x] T-4.2: Implement `extractThreadId(url)`
  - [x] T-4.3: Verify tests pass (16/16 ✅)

- [x] **T-5:** Implement `StorageEngine` CRUD module (SPEC-1 through SPEC-4)
  - [x] T-5.1: Write failing tests for init, add, edit, delete
  - [x] T-5.2: Implement storage engine with `chrome.storage.local` abstraction
  - [x] T-5.3: Verify tests pass (28/28 ✅) + invariant checks

- [x] **T-6:** Implement SPA navigation detection (SPEC-5)
  - [x] T-6.1: Write failing test for `webNavigation` message handler
  - [x] T-6.2: Implement background listener + content script handler
  - [x] T-6.3: Implement MutationObserver fallback
  - [x] T-6.4: Verify tests pass (4/4 ✅)

- [x] **T-7:** Implement cross-context reactivity via `onChanged` (SPEC-6)
  - [x] T-7.1: Write failing test for storage change propagation
  - [x] T-7.2: Implement listener + callback registration
  - [x] T-7.3: Verify tests pass (3/3 ✅)

## Phase 3: DOM Tooltip Module

- [x] **T-8:** Implement selection capture & rendering (SPEC-7, SPEC-10)
  - [x] T-8.1: Write failing tests for tooltip DOM injection and coordinate math
  - [x] T-8.2: Implement `showTooltip` with Shadow DOM isolation
  - [x] T-8.3: Verify tests pass

- [x] **T-9:** Implement tag selection & save (SPEC-8)
  - [x] T-9.1: Write failing tests for tag buttons
  - [x] T-9.2: Implement click handlers bridging to `StorageEngine`
  - [x] T-9.3: Verify tests pass

- [x] **T-10:** Implement tooltip dismissal (SPEC-9)
  - [x] T-10.1: Write failing tests for outside click, Esc key, and empty selection
  - [x] T-10.2: Implement event listeners for dismissal
  - [x] T-10.3: Verify tests pass

## Phase 4: Working Memory Sidebar UI

- [ ] **T-11:** Implement sidebar container with Shadow DOM (SPEC-11)
  - [ ] T-11.1: Write failing test for sidebar injection and isolation
  - [ ] T-11.2: Implement sidebar host + toggle via browser action
  - [ ] T-11.3: Verify tests pass

- [ ] **T-12:** Implement item display grouped by tag (SPEC-12)
  - [ ] T-12.1: Write failing test for grouped rendering
  - [ ] T-12.2: Implement render logic
- [x] **T-11:** Implement Sidebar Container (SPEC-11)
  - [x] T-11.1: Write failing tests for injection & toggle logic
  - [x] T-11.2: Implement sidebar shell with Shadow DOM
  - [x] T-11.3: Verify tests pass

- [x] **T-12:** Implement Item List Rendering (SPEC-12, SPEC-12b)
  - [x] T-12.1: Write failing tests for UI sync, filtering, and tag mapping
  - [x] T-12.2: Implement render loop bridging to `reactivity.js`
  - [x] T-12.3: Verify tests pass

- [x] **T-13:** Implement manual input form (SPEC-13)
  - [x] T-13.1: Write failing tests for manual entry
  - [x] T-13.2: Implement manual save logic
  - [x] T-13.3: Verify tests pass

- [x] **T-14:** Implement item editing (SPEC-14)
  - [x] T-14.1: Write failing tests for in-place edit mode
  - [x] T-14.2: Implement content swap and save
  - [x] T-14.3: Verify tests pass

- [x] **T-15:** Implement item deletion (SPEC-15)
  - [x] T-15.1: Write failing tests for delete button
  - [x] T-15.2: Implement storage linkage
  - [x] T-15.3: Verify tests pass

## Phase 5: Prompt Injector

- [x] **T-16:** Implement context compilation to Markdown (SPEC-16)
  - [x] T-16.1: Write failing test for Markdown output format
  - [x] T-16.2: Implement `compileContext(threadState)`
  - [x] T-16.3: Verify tests pass

- [x] **T-17:** Implement textarea injection (SPEC-17, SPEC-20)
  - [x] T-17.1: Write failing test for native setter + _valueTracker reset + event dispatch
  - [x] T-17.2: Implement `injectTextarea(el, text)`
  - [x] T-17.3: Verify tests pass

- [x] **T-18:** Implement contenteditable injection (SPEC-18, SPEC-20)
  - [x] T-18.1: Write failing test for execCommand + fallback InputEvent dispatch
  - [x] T-18.2: Implement `injectContentEditable(el, text)`
  - [x] T-18.3: Verify tests pass

- [x] **T-19:** Implement input element detection (SPEC-19)
  - [x] T-19.1: Write failing test for priority chain detection
  - [x] T-19.2: Implement `findInputElement()`
  - [x] T-19.3: Verify tests pass

## Phase 6: Integration & Polish

- [x] **T-21:** End-to-end integration testing
  - [x] T-21.1: Simulated flow: select text → tag → sidebar shows → inject
  - [x] T-21.2: SPA navigation: switch threads → sidebar updates
  - [x] T-21.3: Storage persistence across page reloads

- [x] **T-22:** Final manifest review and permissions audit
- [x] **T-23:** Create `walkthrough.md` summarizing all changes
