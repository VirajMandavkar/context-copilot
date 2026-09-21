# Privacy Policy for Context Copilot

**Last Updated: September 20, 2026**

Context Copilot ("we", "us", or "our") respects your privacy. This Privacy Policy describes how your information is handled when you use the Context Copilot browser extension.

---

### 1. Zero-Knowledge & Local-First Philosophy
Context Copilot is designed with a strict **local-first architecture**:
- **Your Notes, Tags, and Chats**: All context snippets, decisions, constraints, tasks, and notes that you highlight or create remain **100% inside your browser's local storage** (`chrome.storage.local`).
- **No Analytics or Telemetry**: We do not track your browsing activity, page visits, prompt inputs, or keystrokes.
- **No Third-Party AI Data Sharing**: We do not store or transmit your chat conversations to any server. When you use the "Inject Context" feature, text is inserted directly into your active browser tab's prompt input on ChatGPT, Claude, or Gemini without routing through any intermediary servers.

---

### 2. License Key Verification (Pro Users Only)
If you choose to purchase and activate a Pro license:
- **What is transmitted**: When you activate or validate your Pro license key, your license key and an anonymized device identifier (`instance_id`) are sent directly to our merchant of record, **Lemon Squeezy** (`https://api.lemonsqueezy.com`).
- **Purpose**: This communication is strictly used to verify the validity of your subscription and manage device activations.
- **Payment Information**: All payment transactions are processed entirely by Lemon Squeezy. Context Copilot does not collect, process, or store credit card numbers, billing addresses, or banking details.

---

### 3. Permissions Used by the Extension
Context Copilot requests minimal browser permissions necessary to operate:
- `storage`: Required to save your sessions, tags, and notes locally in your browser.
- `webNavigation`: Required to detect client-side route changes within single-page applications (ChatGPT, Claude, Gemini) so that the sidebar updates when you switch chat threads.
- `tabs`: Required to communicate sidebar toggle states between the extension service worker and the active web page.
- `host_permissions` (`*://chatgpt.com/*`, `*://*.claude.ai/*`, `*://gemini.google.com/*`): Required to inject the sidebar and context capture tooltip into supported AI web apps.
- `host_permissions` (`https://api.lemonsqueezy.com/*`): Required to verify license keys for Pro users directly with Lemon Squeezy.

---

### 4. Third-Party Services
Context Copilot interfaces with:
- **Lemon Squeezy**: Merchant of record handling Pro checkout and license key validation. [Lemon Squeezy Privacy Policy](https://www.lemonsqueezy.com/privacy)

---

### 5. Data Retention & Deletion
Because all your data is stored locally in your browser:
- You can clear your notes, sessions, or license keys at any time via the extension settings or by clicking "Clear Session Notes".
- Uninstalling Context Copilot automatically deletes all stored notes, sessions, and cached data from your device.

---

### 6. Contact & Support
If you have questions or concerns regarding this Privacy Policy, you may contact us at:
- **Email**: `support@contextcopilot.dev` (or your preferred support email)
- **GitHub**: [https://github.com/contextcopilot](https://github.com)
