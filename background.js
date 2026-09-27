// background.js — Context Copilot Service Worker
// Implements: sidebar toggle (SPEC-11), SPA navigation detection (SPEC-5)

// Safely send messages to tabs (ignores errors if content script isn't loaded, e.g. on New Tab page)
async function safeSendMessage(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    console.log('Could not send message to tab', tabId, 'Is it a valid webpage?', err);
  }
}

// Toggle sidebar on browser action click (SPEC-11)
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) safeSendMessage(tab.id, { type: 'CC_TOGGLE_SIDEBAR' });
});

// Toggle sidebar on keyboard shortcut (SPEC-11)
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'toggle-sidebar') {
    let targetTabId = tab?.id;
    if (!targetTabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTabId = activeTab?.id;
    }
    if (targetTabId) {
      safeSendMessage(targetTabId, { type: 'CC_TOGGLE_SIDEBAR' });
    }
  }
});

// SPA navigation detection (SPEC-5)
// Notify content script when client-side routing changes the URL
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) {
    // Only top-level frame
    safeSendMessage(details.tabId, {
      type: 'CC_URL_CHANGED',
      url: details.url,
    });
  }
});

// First-time onboarding: Open welcome.html on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});


