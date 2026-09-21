// src/license/guard.js — Feature Gating & Tier Limits
// Enforces Free vs Pro constraints across Context Copilot

import { isProUserSync, isProUser } from './engine.js';

export const FREE_LIMITS = {
  MAX_SESSIONS: 1,
  MAX_ITEMS: 20
};

/**
 * Check if the user is allowed to create another session.
 * @param {number} currentSessionCount 
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function canCreateSession(currentSessionCount) {
  const isPro = await isProUser();
  if (isPro) return { allowed: true };

  if (currentSessionCount >= FREE_LIMITS.MAX_SESSIONS) {
    return {
      allowed: false,
      reason: `Free tier is limited to ${FREE_LIMITS.MAX_SESSIONS} active session. Upgrade to Pro for unlimited sessions.`
    };
  }
  return { allowed: true };
}

/**
 * Check if the user is allowed to add another item to the session.
 * @param {number} currentItemCount 
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function canAddItem(currentItemCount) {
  const isPro = await isProUser();
  if (isPro) return { allowed: true };

  if (currentItemCount >= FREE_LIMITS.MAX_ITEMS) {
    return {
      allowed: false,
      reason: `Free tier is limited to ${FREE_LIMITS.MAX_ITEMS} notes per session. Upgrade to Pro for unlimited working memory.`
    };
  }
  return { allowed: true };
}

/**
 * Check if user is allowed to create or manage custom groups.
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function canUseGrouping() {
  const isPro = await isProUser();
  if (isPro) return { allowed: true };

  return {
    allowed: false,
    reason: 'User-Named Grouping & Collapsible Accordions are a Pro feature. Upgrade to Pro to organize notes by project phase.'
  };
}

/**
 * Synchronous check for grouping (for UI button states).
 * @returns {boolean}
 */
export function isGroupingAllowedSync() {
  return isProUserSync();
}
