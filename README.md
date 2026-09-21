# Context Copilot 🧠

**Context Copilot** is a lightweight, privacy-first Chromium browser extension that serves as persistent working memory across AI chats. It lets you capture decisions, constraints, tasks, and notes from any chat, organize them into shareable sessions, and inject compiled context back into any AI prompt or copy it to your clipboard with one click.

---

## 🌐 Supported AI Platforms

Context Copilot runs everywhere and has native optimizations for:
- **ChatGPT** (`chatgpt.com`, `chat.openai.com`)
- **Claude** (`claude.ai`)
- **Google Gemini** (`gemini.google.com`)
- **Perplexity** (`perplexity.ai`)
- **DeepSeek** (`chat.deepseek.com`)
- **Mistral / Le Chat** (`chat.mistral.ai`)
- **Microsoft Copilot** & any web interface with a textarea or contenteditable editor.

---

## 🚀 Installation & Setup (For Testing on Any Device)

Works on any Chromium browser: **Google Chrome, Brave, Microsoft Edge, Opera, Vivaldi**.

### Step 1: Get the Extension Folder
- Either pull this repository and build:
  ```bash
  npm install
  npm run build
  ```
- Or copy the pre-built `dist/` folder directly to the tester's laptop / device.

### Step 2: Load into Browser
1. Open your browser and navigate to the Extensions page:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **"Load unpacked"** button in the top-left corner.
4. Select the `dist/` directory.
5. You will see **Context Copilot** appear in your extension list!

---

## 📖 Walkthrough: How to Use

### 1. Effortless Opening and Closing
Context Copilot offers multiple ergonomic ways to toggle the sidebar:
- **🎛️ Floating Edge Tab ("Peek Tab")**: A sleek, dark tab pinned to the right edge of your screen. Click it anytime to smoothly slide the sidebar open or closed.
  - **Live Item Counter**: Displays a live badge showing how many items are saved in the current session (e.g. `‹ [3]`).
  - **Capture Pulse**: Whenever you highlight and tag an item, the tab badge pulses and flashes green/cyan for instant visual feedback—even when the sidebar is closed!
  - **Draggable**: Drag the tab up or down along the screen edge so it never blocks chat buttons or toolbars. Your preferred position is saved across tabs.
- **⌨️ Universal `Escape` Key**: Press `Escape` anytime to instantly close the sidebar.
- **⌨️ Global Keyboard Shortcut**: Press `Alt + Shift + C` (or `MacCtrl + Shift + C` on macOS) anywhere.
- **Header Close Button**: Click the clean `✕` icon in the top-right corner of the sidebar header.
- **Browser Icon**: Click the Context Copilot icon in your browser extension toolbar.

---

### 2. Manual Session Management (No Phantom Sessions)
- **Zero Background Clutter**: Browsing past chat threads in ChatGPT, Claude, or Gemini **never** automatically creates sessions in storage.
- **Unlinked Chats**: When opening a chat that doesn't have an assigned session, the top bar displays `"Select or + New Session"`.
- **Creating a Session**:
  - Click the **`+`** button in the toolbar or click **`+ New Session`** inside the dropdown menu.
  - Or, highlight any text or type a manual note — Context Copilot will automatically link a session for this chat upon your first save!
- **Switching Sessions**: Click the session dropdown `▼` to select any saved session and bring its context into the current chat.
- **Renaming a Session**: Click the pencil icon (`✎`) to rename the active session.
- **Clearing Session Notes**: Click the red trash icon (`🗑️`) in the session toolbar to clear all notes in the active session with confirmation.
- **Deleting a Session**: Open the dropdown menu `▼`, click the trash icon (`🗑️`) next to a session, and type `"delete"` to confirm.

---

### 3. Capturing Context from Chat Messages (Quick Highlight)
1. In ChatGPT, Claude, Gemini, or any chat interface, select/highlight any snippet of text with your mouse.
2. A floating tooltip menu will automatically appear near your cursor with 4 color-coded tags:
   - 🟣 **Decision**: Architectural or product choices made during the conversation.
   - 🔴 **Constraint**: Technical boundaries, rules, or requirements.
   - 🟢 **Task**: Action items (interactive checkboxes).
   - 🔵 **Note**: Explanations or general reference knowledge.
3. Click any tag to save it instantly to your session.

---

### 4. Interactive Task Checkboxes (`- [x] Done`)
- Any item saved with the **Task** tag includes an interactive checkbox in the sidebar.
- Click the checkbox to toggle task completion:
  - Completed tasks are visually struck through in the sidebar.
  - When injected or copied, completed tasks format as `- [x] <task>` and open tasks format as `- [ ] <task>`.

---

### 5. Adding Manual Notes with Optional Titles
1. Open the sidebar and scroll to the bottom **Manual Input** form.
2. (Optional) Type a short title / label in the **Title** field (e.g. `Proxy Architecture`, `Max Token Limit`).
3. Type your note in the text area.
4. Select a category (`Decision`, `Constraint`, `Task`, `Note`).
5. Click **Save**.

---

### 6. Clean Card Previews & Expansion
- **Compact View**: Long notes (multi-paragraph or > 160 characters) are automatically truncated to the first 3 lines so you can easily scan your list.
- **Expand / Collapse**: Click **`▾ Show more`** to expand any note card to its full length. Click **`▴ Show less`** to collapse it back.
- **Titles**: Cards with a title display a bold label above their content for quick skimming.

---

### 7. Searching & Tag Filtering
- **Tag Pills**: Click any colored pill button (**All**, **Decision**, **Constraint**, **Task**, **Note**) to instantly isolate only items with that exact category.
- **Keyword Search**: Type in the search box to search across content, titles, and tags without losing your active tag filter.

---

### 8. User-Named Grouping & Collapsible Accordions
- **Custom Groups**: Organize notes into custom user-named project groups (e.g. `Frontend UI`, `Go Proxy`, `Auth & DB`).
- **Group Selector Dropdown**: Directly below the session bar, use the group dropdown `[ All Groups ▾ ]` to filter cards by group.
- **Group Actions**:
  - **`+`**: Create a new custom group.
  - **`✎`**: Rename the active group (updates all items in that group automatically).
  - **`🗑️`**: Delete the active group (items become ungrouped without data loss).
- **Accordion View**: When viewing "All Groups", items are neatly organized under collapsible accordion headers (`▾ Frontend UI (3)`). Click any header to toggle expand/collapse.
- **Card Badges & Reassignment**:
  - Cards belonging to a group display a subtle group badge in their header.
  - In edit mode, use the group dropdown to move a card to another group or to "Ungrouped".
- **Manual Input with Groups**: The manual note form includes a group selector defaulting to your active group.

---

### 9. Drag-and-Drop Card Organization
- **Reorder Cards**: Grab the `⋮⋮` handle on any card and drag it above or below other cards to reorder memory items.
- **Move Across Groups**: In "All Groups" view, drag a card directly into another accordion section (or onto its header) to instantly reassign it to that group.
- **Visual Feedback**: Real-time blue insertion indicator lines show exactly where the card will land.

---

### 10. Editing and Deleting Notes
- **Edit**: Click **Edit** on any note card to modify its content, title, or group inline. Click **Save** or **Cancel**.
- **Delete**: Click **Delete** to immediately remove a single item from memory.

---

### 11. Injecting or Copying Memory (Group & Tag Scoped)

Context Copilot dynamically adapts its injection and copying based on your active group and tag filter:
- When on **All Groups** and **All** tags: Injects/copies everything, formatted hierarchically with `### Group: <Name>` headers.
- When scoped to a **specific group**: Injects/copies **only items from that group** (e.g. `## Working Memory (Context Copilot) — Frontend UI`).
- When combined with a tag tab: Injects/copies only matching items in that category and group.

#### Option A: Inject Context Directly into the Chat Prompt
1. Click the blue **"Inject"** button in the sidebar header.
2. Context Copilot formats your working memory into structured Markdown and pastes it into the active chat prompt (ChatGPT, Claude, Gemini, etc.).
3. The button displays **`✓ Injected!`** as visual confirmation.

#### Option B: Copy Context to Clipboard
1. Click the **"Copy"** button in the sidebar header.
2. Formatted Markdown is copied directly to your system clipboard for use in Notion, Obsidian, GitHub issues, Slack, or your IDE.
3. The button displays **`✓ Copied!`** as visual confirmation.

Example Compiled Output:
```markdown
---
## Working Memory (Context Copilot)

### Decisions
- Use Postgres for relational queries
- Keep authentication stateless via JWT

### Constraints
- No third-party tracking scripts
- Compatible with Node 18+

### Tasks
- [x] Implement rate limiting
- [ ] Add unit tests for database schema

### Notes
- Refer to RFC 7519 for JWT specification
---
```

---

## 🛠️ Developer & Verification Commands

- **Run All Unit Tests**:
  ```bash
  npx vitest run
  ```
- **Build Extension**:
  ```bash
  npm run build
  ```
  *(Outputs clean bundle to `dist/`)*
