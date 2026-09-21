// tests/setup.js — Global test setup for Context Copilot
// Provides chrome.* API mocks for all tests.
// SPEC reference: Required by all storage/navigation tests (SPEC-1 through SPEC-6).

// happy-dom doesn't implement document.execCommand (deprecated browser API).
// Provide a stub so tests can vi.spyOn() it. Default returns false (fallback path).
if (typeof document !== 'undefined' && !document.execCommand) {
  document.execCommand = function () {
    return false;
  };
}

// In a real browser, closed shadow roots are inaccessible via .shadowRoot.
// However, our tests need to interact with the DOM elements inside the tooltip.
// We patch attachShadow to always expose a .shadowRoot property in testing.
if (typeof Element !== 'undefined' && Element.prototype.attachShadow) {
  const originalAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(init) {
    const shadow = originalAttachShadow.call(this, init);
    // Force exposure for testing purposes even if closed
    Object.defineProperty(this, 'shadowRoot', {
      value: shadow,
      configurable: true
    });
    return shadow;
  };
}

/**
 * Minimal chrome.storage.local mock.
 * Each test should call `resetChromeStorageMock()` in beforeEach to get a clean slate.
 */
let _store = {};

export function resetChromeStorageMock() {
  _store = {};
  _onChangedListeners.length = 0;
}

const _onChangedListeners = [];

const chromeStorageLocal = {
  async get(keys, callback) {
    let result = {};
    if (keys === null || keys === undefined) {
      result = { ..._store };
    } else if (typeof keys === 'string') {
      keys = [keys];
    }
    if (Array.isArray(keys)) {
      result = {};
      for (const key of keys) {
        if (key in _store) {
          result[key] = structuredClone(_store[key]);
        }
      }
    } else if (typeof keys === 'object' && keys !== null) {
      // Object with defaults
      result = {};
      for (const [key, defaultValue] of Object.entries(keys)) {
        result[key] = key in _store ? structuredClone(_store[key]) : defaultValue;
      }
    }
    if (typeof callback === 'function') {
      callback(result);
    }
    return result;
  },

  async set(items) {
    const changes = {};
    for (const [key, value] of Object.entries(items)) {
      const oldValue = _store[key];
      _store[key] = structuredClone(value);
      changes[key] = {
        oldValue: oldValue !== undefined ? structuredClone(oldValue) : undefined,
        newValue: structuredClone(value),
      };
    }
    // Fire onChanged listeners (SPEC-6: fires in same context)
    for (const listener of _onChangedListeners) {
      listener(changes, 'local');
    }
  },

  async remove(keys) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    const changes = {};
    for (const key of keys) {
      if (key in _store) {
        changes[key] = {
          oldValue: structuredClone(_store[key]),
          newValue: undefined,
        };
        delete _store[key];
      }
    }
    if (Object.keys(changes).length > 0) {
      for (const listener of _onChangedListeners) {
        listener(changes, 'local');
      }
    }
  },

  onChanged: {
    addListener(fn) {
      _onChangedListeners.push(fn);
    },
    removeListener(fn) {
      const idx = _onChangedListeners.indexOf(fn);
      if (idx !== -1) _onChangedListeners.splice(idx, 1);
    },
  },
  
  async clear() {
    _store = {};
    _onChangedListeners.length = 0;
  }
};

const chromeStorage = {
  local: chromeStorageLocal,
  onChanged: {
    addListener(fn) {
      _onChangedListeners.push(fn);
    },
    removeListener(fn) {
      const idx = _onChangedListeners.indexOf(fn);
      if (idx !== -1) _onChangedListeners.splice(idx, 1);
    },
  },
};

// Mock chrome.runtime for messaging
const _messageListeners = [];

const chromeRuntime = {
  id: 'mock-extension-id',
  onMessage: {
    addListener(fn) {
      _messageListeners.push(fn);
    },
    removeListener(fn) {
      const idx = _messageListeners.indexOf(fn);
      if (idx !== -1) _messageListeners.splice(idx, 1);
    },
  },
  sendMessage: vi.fn(),
};

// Mock chrome.tabs
const chromeTabs = {
  sendMessage: vi.fn(),
  query: vi.fn().mockResolvedValue([]),
};

// Mock chrome.action
const chromeAction = {
  onClicked: {
    addListener: vi.fn(),
  },
};

// Mock chrome.commands
const chromeCommands = {
  onCommand: {
    addListener: vi.fn(),
  },
};

// Mock chrome.webNavigation
const chromeWebNavigation = {
  onHistoryStateUpdated: {
    addListener: vi.fn(),
  },
};

// Install global chrome mock
globalThis.chrome = {
  storage: chromeStorage,
  runtime: chromeRuntime,
  tabs: chromeTabs,
  action: chromeAction,
  commands: chromeCommands,
  webNavigation: chromeWebNavigation,
};

// Export for tests that need to manipulate the mock
export { _store, _messageListeners, _onChangedListeners };
