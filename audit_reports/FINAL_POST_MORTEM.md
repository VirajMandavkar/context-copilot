# Post-Mortem Security & Systems Audit Report

## 1. Secrets & Credentials (Gitleaks)
- **Findings**: `0` secrets found.
- **Analysis**: A full historical scan of the repository using Gitleaks confirmed that no hardcoded secrets, API keys, or sensitive credentials have been committed.

## 2. Dependency & Filesystem Vulnerabilities (Trivy)
- **Findings**: `0` vulnerabilities found.
- **Analysis**: Trivy scanned the filesystem and dependency trees and identified no known CVEs or vulnerable packages that require immediate bumping. The project architecture relies on minimal dependencies and a zero-backend model, keeping the attack surface extremely small.

## 3. Structural & Logic Flaws (Semgrep)
- **Findings**: `4` findings.
- **Analysis**:
  - **`django-no-csrf-token` (WAITLIST_TEMPLATE.html, index.html)**: Semgrep falsely identified the static HTML waitlist forms as Django templates missing CSRF tokens. Since these files are static and post directly to Formspree (`https://formspree.io/f/YOUR_FORM_ID`), this is a false positive and not a vulnerability.
  - **`unsafe-formatstring` (background.js:9, reactivity.js:24)**: Semgrep flagged the use of string interpolation inside `console.log()` statements (e.g. `` console.log(`Could not send message to tab ${tabId}...`, err) ``). While technically a violation of strict format-string rules in server environments, this is entirely benign in the context of a client-side browser extension's local console.

## 4. Root Cause of Free Tier "Bypass" (Architectural Logic Flaw)
While automated SAST tools did not capture it, a manual architectural audit identified the precise cause of the Free Tier bypass reported by the user:
- **Flaw**: Time-of-Check to Time-of-Use (TOCTOU) Race Condition + State Hydration Lag.
- **Explanation**: 
  1. The `isProUserSync()` function evaluates to `false` when the extension initially boots on a new tab because `getLicenseState()` (which performs the async `chrome.storage` fetch) had not yet warmed the cache. This causes the UI to incorrectly render the "Upgrade Context Copilot" badge to users who legitimately activated a test license.
  2. When the user clicks "+ New Session", the UI's click handler triggers `canCreateSession()`. This function *is* asynchronous, correctly reads the cached test license from storage, realizes the user is a Pro user, and bypasses the 1-session limit. 
  3. Furthermore, the event listeners on the `+ New Session` row and button lacked debounce/pointer-event locks. If a legitimate free user double-clicked the button rapidly, both threads would evaluate `sessionCount = 0` concurrently, allowing the execution of `createAndLinkSessionForThread` twice.
- **Resolution**: Both the synchronous cache hydration on boot and the UI race condition locks have been successfully patched in `content.js` and `src/sidebar/session.js`.
