// src/license/engine.js — Lemon Squeezy License Management & Verification
// Zero-backend integration using Lemon Squeezy's public License API

export const LICENSE_STORAGE_KEY = 'cc_license';
const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1/licenses';
const VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let cachedLicenseState = null;
const licenseChangeListeners = new Set();

function notifyListeners(state) {
  licenseChangeListeners.forEach(fn => {
    try {
      fn(state);
    } catch (err) {
      console.error('[ContextCopilot] Error in license listener:', err);
    }
  });
}

/**
 * Get current stored license state.
 * @returns {Promise<object|null>}
 */
export async function getLicenseState() {
  if (cachedLicenseState) return cachedLicenseState;

  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return cachedLicenseState;
  }

  try {
    const res = await chrome.storage.local.get([LICENSE_STORAGE_KEY]);
    cachedLicenseState = res?.[LICENSE_STORAGE_KEY] || null;
  } catch (err) {
    console.error('[ContextCopilot] Error retrieving license state:', err);
  }

  return cachedLicenseState;
}

/**
 * Synchronous check if the user currently has an active Pro license.
 * @returns {boolean}
 */
export function isProUserSync() {
  if (!cachedLicenseState) return false;
  if (cachedLicenseState.status !== 'active') return false;
  if (cachedLicenseState.expires_at) {
    const expiry = new Date(cachedLicenseState.expires_at).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) {
      return false;
    }
  }
  return true;
}

/**
 * Async check if the user has an active Pro license.
 * @returns {Promise<boolean>}
 */
export async function isProUser() {
  const state = await getLicenseState();
  if (!state) return false;
  if (state.status !== 'active') return false;
  if (state.expires_at) {
    const expiry = new Date(state.expires_at).getTime();
    if (!isNaN(expiry) && expiry < Date.now()) {
      return false;
    }
  }
  return true;
}

/**
 * Activate a license key with Lemon Squeezy.
 * @param {string} licenseKey 
 * @returns {Promise<{ success: boolean, error?: string, state?: object }>}
 */
export async function activateLicense(licenseKey) {
  const key = (licenseKey || '').trim();
  if (!key) {
    return { success: false, error: 'License key cannot be empty.' };
  }

  try {
    const res = await fetch(`${LEMON_API_BASE}/activate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        license_key: key,
        instance_name: 'Context Copilot Browser'
      })
    });

    const data = await res.json();

    if (!res.ok || data.error || !data.activated) {
      const errorMsg = data.error || data.message || 'Invalid or expired license key.';
      return { success: false, error: errorMsg };
    }

    const state = {
      license_key: key,
      status: data.license_key?.status || 'active',
      instance_id: data.instance?.id || null,
      customer_email: data.meta?.customer_email || '',
      customer_name: data.meta?.customer_name || '',
      expires_at: data.license_key?.expires_at || null,
      last_validated: Date.now()
    };

    cachedLicenseState = state;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [LICENSE_STORAGE_KEY]: state });
    }

    notifyListeners(state);
    return { success: true, state };
  } catch (err) {
    console.error('[ContextCopilot] License activation network error:', err);
    return { success: false, error: 'Network error connecting to Lemon Squeezy. Please check your connection.' };
  }
}

/**
 * Validate current license in background.
 * Fails gracefully if offline, maintaining active status.
 * @param {boolean} [force=false]
 * @returns {Promise<{ valid: boolean, state?: object }>}
 */
export async function validateLicense(force = false) {
  const state = await getLicenseState();
  if (!state || !state.license_key) {
    return { valid: false };
  }

  // Skip if validated recently unless forced
  const timeSinceValidation = Date.now() - (state.last_validated || 0);
  if (!force && timeSinceValidation < VALIDATION_INTERVAL_MS) {
    return { valid: isProUserSync(), state };
  }

  try {
    const params = new URLSearchParams({
      license_key: state.license_key
    });
    if (state.instance_id) {
      params.append('instance_id', state.instance_id);
    }

    const res = await fetch(`${LEMON_API_BASE}/validate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    const data = await res.json();

    if (res.ok && data.valid) {
      state.status = data.license_key?.status || 'active';
      state.expires_at = data.license_key?.expires_at || state.expires_at;
      state.last_validated = Date.now();

      cachedLicenseState = state;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [LICENSE_STORAGE_KEY]: state });
      }
      notifyListeners(state);
      return { valid: true, state };
    } else {
      // License is explicitly invalid or expired
      state.status = 'expired';
      state.last_validated = Date.now();
      cachedLicenseState = state;
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [LICENSE_STORAGE_KEY]: state });
      }
      notifyListeners(state);
      return { valid: false, state };
    }
  } catch (err) {
    // Graceful offline fallback: keep cached status if network fails
    console.log('[ContextCopilot] License validation offline/error. Using cached state.');
    return { valid: isProUserSync(), state };
  }
}

/**
 * Deactivate the current license and revert to Free tier.
 * @returns {Promise<boolean>}
 */
export async function deactivateLicense() {
  const state = await getLicenseState();
  if (!state || !state.license_key) return true;

  try {
    if (state.instance_id) {
      await fetch(`${LEMON_API_BASE}/deactivate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          license_key: state.license_key,
          instance_id: state.instance_id
        })
      });
    }
  } catch (err) {
    console.error('[ContextCopilot] Error deactivating license remotely:', err);
  }

  cachedLicenseState = null;
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.remove([LICENSE_STORAGE_KEY]);
  }

  notifyListeners(null);
  return true;
}

/**
 * Subscribe to license changes.
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export function onLicenseChange(callback) {
  if (typeof callback === 'function') {
    licenseChangeListeners.add(callback);
    return () => licenseChangeListeners.delete(callback);
  }
  return () => {};
}
