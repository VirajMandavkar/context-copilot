// src/storage/engine.js — Storage Engine CRUD
// Implements: SPEC-1 (init), SPEC-2 (add), SPEC-3 (edit), SPEC-4 (delete), SPEC-21 (sessions)

const INDEX_KEY = 'cc_session_index';
const SESSION_PREFIX = 'cc_session:';



// SPEC-2: Valid tags
const VALID_TAGS = new Set(['decision', 'constraint', 'task', 'note']);
const VALID_SOURCES = new Set(['selection', 'manual']);

/**
 * Get the session index from storage.
 * @returns {Promise<object>}
 */
export async function getSessionIndex() {
  if (!chrome.runtime?.id) {
    return { version: 2, sessions: {}, url_mappings: {} };
  }
  try {
    const result = await chrome.storage.local.get(INDEX_KEY);
    const data = result[INDEX_KEY];
    if (!data || typeof data !== 'object') {
      return { version: 2, sessions: {}, url_mappings: {} };
    }
    if (!data.sessions || typeof data.sessions !== 'object') data.sessions = {};
    if (!data.url_mappings || typeof data.url_mappings !== 'object') data.url_mappings = {};
    return data;
  } catch (err) {
    if (err?.message?.includes('Extension context invalidated')) {
      return { version: 2, sessions: {}, url_mappings: {} };
    }
    throw err;
  }
}

/**
 * Get a SessionState from storage by session_id.
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
export async function getSessionState(sessionId) {
  if (!chrome.runtime?.id || !sessionId) return null;
  try {
    const key = SESSION_PREFIX + sessionId;
    const result = await chrome.storage.local.get(key);
    const data = result[key];
    if (!data || typeof data !== 'object') return null;
    if (!data.items || !Array.isArray(data.items)) data.items = [];
    if (!data.groups || !Array.isArray(data.groups)) data.groups = [];
    return data;
  } catch (err) {
    if (err?.message?.includes('Extension context invalidated')) {
      return null;
    }
    throw err;
  }
}

/**
 * Check if a session already exists for a thread/URL without creating a new one.
 * @param {string} threadId
 * @returns {Promise<{ sessionId: string | null, state: object | null }>}
 */
export async function getSessionForThread(threadId) {
  await migrateV1toV2();
  const index = await getSessionIndex();
  const sessionId = index.url_mappings[threadId];
  if (sessionId) {
    const existing = await getSessionState(sessionId);
    if (existing) return { sessionId, state: existing };
  }
  return { sessionId: null, state: null };
}

/**
 * Manually creates and links a new session for a thread.
 * @param {string} threadId
 * @param {string} url
 * @param {string} [name='New Session']
 * @returns {Promise<{ sessionId: string, state: object }>}
 */
export async function createAndLinkSessionForThread(threadId, url, name = 'New Session') {
  await migrateV1toV2();
  const sessionId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36);

  let originAi = 'Other';
  if (url.includes('chatgpt.com') || url.includes('openai.com')) originAi = 'ChatGPT';
  else if (url.includes('claude.ai')) originAi = 'Claude';
  else if (url.includes('gemini.google.com')) originAi = 'Gemini';
  else if (url.includes('perplexity.ai')) originAi = 'Perplexity';
  else if (url.includes('deepseek.com')) originAi = 'DeepSeek';
  else if (url.includes('mistral.ai')) originAi = 'Mistral';

  const now = new Date().toISOString();
  const index = await getSessionIndex();

  index.sessions[sessionId] = {
    name: name || 'New Session',
    origin_ai: originAi,
    created_at: now,
    updated_at: now,
    item_count: 0
  };
  if (threadId) {
    index.url_mappings[threadId] = sessionId;
  }

  const sessionState = {
    session_id: sessionId,
    groups: [],
    items: [],
  };

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: sessionState,
    [INDEX_KEY]: index,
  });

  return { sessionId, state: sessionState };
}

/**
 * Initialize a session for a given thread/url mapping.
 * @param {string} threadId (The URL derived ID)
 * @param {string} url
 * @returns {Promise<{ sessionId: string, state: object }>}
 */
export async function initSessionForThread(threadId, url) {
  await migrateV1toV2(); // Ensure migrated

  const index = await getSessionIndex();
  let sessionId = index.url_mappings[threadId];

  if (sessionId) {
    const existing = await getSessionState(sessionId);
    if (existing) return { sessionId, state: existing };
  }

  // Create new session
  sessionId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36);
  
  let originAi = 'Other';
  if (url.includes('chatgpt.com') || url.includes('openai.com')) originAi = 'ChatGPT';
  else if (url.includes('claude.ai')) originAi = 'Claude';
  else if (url.includes('gemini.google.com')) originAi = 'Gemini';
  else if (url.includes('perplexity.ai')) originAi = 'Perplexity';
  else if (url.includes('deepseek.com')) originAi = 'DeepSeek';
  else if (url.includes('mistral.ai')) originAi = 'Mistral';

  const now = new Date().toISOString();
  
  index.sessions[sessionId] = {
    name: 'New Session',
    origin_ai: originAi,
    created_at: now,
    updated_at: now,
    item_count: 0
  };
  index.url_mappings[threadId] = sessionId;

  const sessionState = {
    session_id: sessionId,
    groups: [],
    items: [],
  };

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: sessionState,
    [INDEX_KEY]: index,
  });

  return { sessionId, state: sessionState };
}

/**
 * Change the active session for a specific thread (URL map).
 */
export async function linkThreadToSession(threadId, sessionId) {
  const index = await getSessionIndex();
  if (!index.sessions[sessionId]) throw new Error('Session does not exist');
  index.url_mappings[threadId] = sessionId;
  await chrome.storage.local.set({ [INDEX_KEY]: index });
}

/**
 * Create a new standalone session without any url_mapping entry.
 * Use this when the user manually creates a session from the UI.
 * @param {string} url — Current page URL (used to derive origin_ai)
 * @returns {Promise<{ sessionId: string, state: object }>}
 */
export async function createSession(url) {
  const sessionId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36);

  let originAi = 'Other';
  if (url.includes('chatgpt.com') || url.includes('openai.com')) originAi = 'ChatGPT';
  else if (url.includes('claude.ai')) originAi = 'Claude';
  else if (url.includes('gemini.google.com')) originAi = 'Gemini';
  else if (url.includes('perplexity.ai')) originAi = 'Perplexity';
  else if (url.includes('deepseek.com')) originAi = 'DeepSeek';
  else if (url.includes('mistral.ai')) originAi = 'Mistral';

  const now = new Date().toISOString();
  const index = await getSessionIndex();

  index.sessions[sessionId] = {
    name: 'New Session',
    origin_ai: originAi,
    created_at: now,
    updated_at: now,
    item_count: 0
  };

  const sessionState = {
    session_id: sessionId,
    groups: [],
    items: [],
  };

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: sessionState,
    [INDEX_KEY]: index,
  });

  return { sessionId, state: sessionState };
}

export async function renameSession(sessionId, newName) {
  const index = await getSessionIndex();
  if (!index.sessions[sessionId]) return false;
  index.sessions[sessionId].name = newName.trim() || 'Untitled';
  index.sessions[sessionId].updated_at = new Date().toISOString();
  await chrome.storage.local.set({ [INDEX_KEY]: index });
  return true;
}

/**
 * Add an item to a session.
 */
export async function addItem(sessionId, itemData) {
  if (!VALID_TAGS.has(itemData.tag)) throw new Error(`Invalid tag: "${itemData.tag}"`);
  if (!VALID_SOURCES.has(itemData.source)) throw new Error(`Invalid source: "${itemData.source}"`);
  const content = (itemData.content || '').trim();
  if (content.length === 0) throw new Error('Content must be non-empty');

  const now = new Date().toISOString();
  const uuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2);

  const item = {
    id: uuid,
    tag: itemData.tag,
    content,
    source: itemData.source,
    selection_context: itemData.selection_context || null,
    created_at: now,
    updated_at: now,
  };
  if (itemData.title && typeof itemData.title === 'string' && itemData.title.trim()) {
    item.title = itemData.title.trim();
  }
  if (itemData.group && typeof itemData.group === 'string' && itemData.group.trim() && itemData.group.trim().toLowerCase() !== 'ungrouped') {
    item.group = itemData.group.trim();
  }

  const state = await getSessionState(sessionId);
  if (!state) throw new Error(`Session "${sessionId}" not initialized.`);
  const index = await getSessionIndex();

  if (!state.items) state.items = [];
  if (!state.groups) state.groups = [];
  if (!index.sessions) index.sessions = {};

  // Auto-register group name if it's new and not already in state.groups
  if (item.group && !state.groups.some(g => g.toLowerCase() === item.group.toLowerCase())) {
    state.groups.push(item.group);
  }

  state.items.push(item);

  if (!index.sessions[sessionId]) {
    index.sessions[sessionId] = { created_at: now, name: 'Recovered Session', origin_ai: 'Other' };
  }

  index.sessions[sessionId].item_count = state.items.length;
  index.sessions[sessionId].updated_at = now;

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: state,
    [INDEX_KEY]: index,
  });

  return item;
}

export async function editItem(sessionId, itemId, newContent, newTitle, newGroup) {
  const content = (newContent || '').trim();
  if (content.length === 0) throw new Error('Content must be non-empty');

  const state = await getSessionState(sessionId);
  if (!state) return false;

  const item = state.items.find((i) => i.id === itemId);
  if (!item) return false;

  const now = new Date().toISOString();
  item.content = content;
  if (newTitle !== undefined) {
    const trimmedTitle = typeof newTitle === 'string' ? newTitle.trim() : '';
    if (trimmedTitle) {
      item.title = trimmedTitle;
    } else {
      delete item.title;
    }
  }
  if (newGroup !== undefined) {
    const trimmedGroup = typeof newGroup === 'string' ? newGroup.trim() : '';
    if (trimmedGroup && trimmedGroup.toLowerCase() !== 'ungrouped') {
      item.group = trimmedGroup;
      // Auto-register group if new
      if (!state.groups) state.groups = [];
      if (!state.groups.some(g => g.toLowerCase() === trimmedGroup.toLowerCase())) {
        state.groups.push(trimmedGroup);
      }
    } else {
      delete item.group;
    }
  }
  item.updated_at = now;

  const index = await getSessionIndex();
  if (!index.sessions[sessionId]) index.sessions[sessionId] = { created_at: now };
  index.sessions[sessionId].updated_at = now;

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: state,
    [INDEX_KEY]: index,
  });

  return true;
}

/**
 * Create a new user-named group in the session.
 * @param {string} sessionId
 * @param {string} groupName
 * @returns {Promise<string>} The created group name
 */
export async function createGroup(sessionId, groupName) {
  const name = (groupName || '').trim();
  if (!name) throw new Error('Group name cannot be empty');
  if (name.toLowerCase() === 'all' || name.toLowerCase() === 'all groups' || name.toLowerCase() === 'ungrouped') {
    throw new Error(`Reserved group name: "${name}"`);
  }

  const state = await getSessionState(sessionId);
  if (!state) throw new Error(`Session "${sessionId}" not initialized.`);

  if (!state.groups) state.groups = [];
  if (state.groups.some(g => g.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Group "${name}" already exists`);
  }

  state.groups.push(name);
  await chrome.storage.local.set({ [SESSION_PREFIX + sessionId]: state });

  return name;
}

/**
 * Rename an existing group in the session and update all items in that group.
 * @param {string} sessionId
 * @param {string} oldName
 * @param {string} newName
 * @returns {Promise<boolean>}
 */
export async function renameGroup(sessionId, oldName, newName) {
  const nextName = (newName || '').trim();
  if (!nextName) throw new Error('New group name cannot be empty');
  if (nextName.toLowerCase() === 'all' || nextName.toLowerCase() === 'all groups' || nextName.toLowerCase() === 'ungrouped') {
    throw new Error(`Reserved group name: "${nextName}"`);
  }

  const state = await getSessionState(sessionId);
  if (!state) return false;

  if (!state.groups) state.groups = [];
  if (state.groups.some(g => g.toLowerCase() === nextName.toLowerCase() && g.toLowerCase() !== oldName.toLowerCase())) {
    throw new Error(`Group "${nextName}" already exists`);
  }

  const idx = state.groups.findIndex(g => g.toLowerCase() === oldName.toLowerCase());
  if (idx !== -1) {
    state.groups[idx] = nextName;
  } else {
    state.groups.push(nextName);
  }

  if (state.items) {
    state.items.forEach(item => {
      if (item.group && item.group.toLowerCase() === oldName.toLowerCase()) {
        item.group = nextName;
        item.updated_at = new Date().toISOString();
      }
    });
  }

  await chrome.storage.local.set({ [SESSION_PREFIX + sessionId]: state });
  return true;
}

/**
 * Delete a group from the session.
 * @param {string} sessionId
 * @param {string} groupName
 * @param {Object} [options]
 * @param {boolean} [options.deleteItems=false]
 * @returns {Promise<boolean>}
 */
export async function deleteGroup(sessionId, groupName, { deleteItems = false } = {}) {
  const state = await getSessionState(sessionId);
  if (!state) return false;

  if (state.groups) {
    state.groups = state.groups.filter(g => g.toLowerCase() !== groupName.toLowerCase());
  }

  if (state.items) {
    if (deleteItems) {
      state.items = state.items.filter(item => !item.group || item.group.toLowerCase() !== groupName.toLowerCase());
    } else {
      state.items.forEach(item => {
        if (item.group && item.group.toLowerCase() === groupName.toLowerCase()) {
          delete item.group;
          item.updated_at = new Date().toISOString();
        }
      });
    }
  }

  if (deleteItems) {
    const index = await getSessionIndex();
    if (index.sessions && index.sessions[sessionId]) {
      index.sessions[sessionId].item_count = state.items.length;
      index.sessions[sessionId].updated_at = new Date().toISOString();
      await chrome.storage.local.set({ [INDEX_KEY]: index });
    }
  }

  await chrome.storage.local.set({ [SESSION_PREFIX + sessionId]: state });
  return true;
}

export async function deleteItem(sessionId, itemId) {
  const state = await getSessionState(sessionId);
  if (!state) return false;

  const idx = state.items.findIndex((i) => i.id === itemId);
  if (idx === -1) return false;

  state.items.splice(idx, 1);

  const now = new Date().toISOString();
  const index = await getSessionIndex();
  
  if (!index.sessions[sessionId]) index.sessions[sessionId] = { created_at: now };
  
  index.sessions[sessionId].item_count = state.items.length;
  index.sessions[sessionId].updated_at = now;

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: state,
    [INDEX_KEY]: index,
  });

  return true;
}

/**
 * Toggles the completed state of a task item.
 * @param {string} sessionId
 * @param {string} itemId
 * @returns {Promise<boolean>} The new completed boolean, or false if not found
 */
export async function toggleTaskCompletion(sessionId, itemId) {
  const state = await getSessionState(sessionId);
  if (!state || !state.items) return false;

  const item = state.items.find((i) => i.id === itemId);
  if (!item) return false;

  item.completed = !item.completed;
  item.updated_at = new Date().toISOString();

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: state,
  });

  return item.completed;
}

/**
 * Clear all items in a session without deleting the session.
 * @param {string} sessionId
 * @returns {Promise<boolean>}
 */
export async function clearSessionItems(sessionId) {
  const state = await getSessionState(sessionId);
  if (!state) return false;

  state.items = [];
  const now = new Date().toISOString();
  const index = await getSessionIndex();

  if (index.sessions && index.sessions[sessionId]) {
    index.sessions[sessionId].item_count = 0;
    index.sessions[sessionId].updated_at = now;
  }

  await chrome.storage.local.set({
    [SESSION_PREFIX + sessionId]: state,
    [INDEX_KEY]: index,
  });

  return true;
}

/**
 * Migrates V1 thread data to V2 session data.
 * @returns {Promise<boolean>} true if migration occurred, false if already migrated
 */
export async function migrateV1toV2() {
  if (!chrome.runtime?.id) return false;
  try {
    const result = await chrome.storage.local.get(null);
    
    if (result['cc_session_index']) {
      return false; // Already on V2
    }

  const v1Index = result['cc_thread_index'];
  if (!v1Index || !v1Index.threads) {
    // No V1 data to migrate, just init empty V2
    await chrome.storage.local.set({
      'cc_session_index': { version: 2, sessions: {}, url_mappings: {} }
    });
    return true;
  }

  const v2Index = {
    version: 2,
    sessions: {},
    url_mappings: {}
  };

  const keysToRemove = ['cc_thread_index'];
  const newStorage = {};

  for (const [threadId, meta] of Object.entries(v1Index.threads)) {
    // The thread ID becomes the session ID for simplicity in migration, 
    // or we can generate a new UUID. Let's just use the threadId as the sessionId for migration.
    const sessionId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'migrated-' + threadId;
    
    let originAi = 'Other';
    if (meta.url) {
      if (meta.url.includes('chatgpt.com') || meta.url.includes('openai.com')) originAi = 'ChatGPT';
      else if (meta.url.includes('claude.ai')) originAi = 'Claude';
      else if (meta.url.includes('gemini.google.com')) originAi = 'Gemini';
      else if (meta.url.includes('perplexity.ai')) originAi = 'Perplexity';
      else if (meta.url.includes('deepseek.com')) originAi = 'DeepSeek';
      else if (meta.url.includes('mistral.ai')) originAi = 'Mistral';
    }

    v2Index.sessions[sessionId] = {
      name: meta.title || 'Recovered Session',
      origin_ai: originAi,
      created_at: meta.created_at || new Date().toISOString(),
      updated_at: meta.updated_at || new Date().toISOString(),
      item_count: meta.item_count || 0
    };

    v2Index.url_mappings[threadId] = sessionId;

    const oldStateKey = 'cc_thread:' + threadId;
    keysToRemove.push(oldStateKey);

    const oldState = result[oldStateKey];
    if (oldState) {
      const newState = {
        session_id: sessionId,
        items: oldState.items || []
      };
      newStorage['cc_session:' + sessionId] = newState;
    }
  }

  newStorage['cc_session_index'] = v2Index;

  await chrome.storage.local.set(newStorage);
  await chrome.storage.local.remove(keysToRemove);

  return true;
  } catch (err) {
    if (err?.message?.includes('Extension context invalidated')) {
      return false;
    }
    throw err;
  }
}

export async function deleteSession(sessionId) {
  const index = await getSessionIndex();
  if (!index.sessions[sessionId]) return false;

  delete index.sessions[sessionId];

  // Clean up any url_mappings pointing to this session
  for (const [urlId, sid] of Object.entries(index.url_mappings)) {
    if (sid === sessionId) {
      delete index.url_mappings[urlId];
    }
  }

  await chrome.storage.local.set({ [INDEX_KEY]: index });
  await chrome.storage.local.remove(SESSION_PREFIX + sessionId);
  
  return true;
}

/**
 * Reorder an item in a session, optionally moving it relative to a target item and/or to a target group.
 * @param {string} sessionId
 * @param {object} options
 * @param {string} options.sourceId - ID of item being moved
 * @param {string} [options.targetId] - ID of target item to place before/after
 * @param {'before'|'after'} [options.position='before'] - Position relative to targetId
 * @param {string} [options.targetGroup] - Optional new group to assign to the item
 * @returns {Promise<boolean>}
 */
export async function reorderItem(sessionId, { sourceId, targetId, position = 'before', targetGroup }) {
  const state = await getSessionState(sessionId);
  if (!state || !Array.isArray(state.items)) return false;

  const sourceIndex = state.items.findIndex(i => i.id === sourceId);
  if (sourceIndex === -1) return false;

  const [sourceItem] = state.items.splice(sourceIndex, 1);

  // Update group if targetGroup is specified
  if (targetGroup !== undefined) {
    if (targetGroup && typeof targetGroup === 'string' && targetGroup.trim() && targetGroup.trim().toLowerCase() !== 'ungrouped') {
      sourceItem.group = targetGroup.trim();
      if (!state.groups) state.groups = [];
      if (!state.groups.some(g => g.toLowerCase() === sourceItem.group.toLowerCase())) {
        state.groups.push(sourceItem.group);
      }
    } else {
      delete sourceItem.group;
    }
  }

  // Insert relative to targetId
  if (targetId) {
    const targetIndex = state.items.findIndex(i => i.id === targetId);
    if (targetIndex === -1) {
      state.items.push(sourceItem);
    } else if (position === 'after') {
      state.items.splice(targetIndex + 1, 0, sourceItem);
    } else {
      state.items.splice(targetIndex, 0, sourceItem);
    }
  } else {
    // If no targetId, place at end of targetGroup's items if possible
    if (targetGroup !== undefined) {
      const groupKey = (targetGroup || 'ungrouped').trim().toLowerCase();
      let lastGroupIdx = -1;
      for (let idx = state.items.length - 1; idx >= 0; idx--) {
        const itemGroupKey = (state.items[idx].group || 'ungrouped').trim().toLowerCase();
        if (itemGroupKey === groupKey) {
          lastGroupIdx = idx;
          break;
        }
      }
      if (lastGroupIdx !== -1) {
        state.items.splice(lastGroupIdx + 1, 0, sourceItem);
      } else {
        state.items.push(sourceItem);
      }
    } else {
      state.items.push(sourceItem);
    }
  }

  await chrome.storage.local.set({ [SESSION_PREFIX + sessionId]: state });
  return true;
}

