// src/sidebar/pro-modal.js — Pro Upgrade & License Management Modal

import { activateLicense, deactivateLicense, getLicenseState, isProUser } from '../license/engine.js';

// Default placeholder checkout URL — will be replaced by user's actual Lemon Squeezy store link
export const LEMON_CHECKOUT_URL = 'https://contextcopilot.lemonsqueezy.com/checkout';

/**
 * Open the Pro Upgrade / License Management modal.
 * @param {HTMLElement} sidebarContainer - Shadow DOM root or container of sidebar
 * @param {string} [triggerReason] - Optional context reason (e.g. "Free tier is limited to 1 session")
 */
export async function openProModal(sidebarContainer, triggerReason = '') {
  // Prevent duplicate modals
  const existing = sidebarContainer.querySelector('.cc-pro-modal-overlay');
  if (existing) existing.remove();

  const isPro = await isProUser();
  const licenseState = await getLicenseState();

  const overlay = document.createElement('div');
  overlay.className = 'cc-pro-modal-overlay';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.background = 'rgba(8, 10, 14, 0.9)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '16px';
  overlay.style.boxSizing = 'border-box';

  const modal = document.createElement('div');
  modal.className = 'cc-pro-modal';
  modal.style.background = '#1c1f27';
  modal.style.border = '1px solid #2a2d38';
  modal.style.borderRadius = '12px';
  modal.style.width = '100%';
  modal.style.maxWidth = '315px';
  modal.style.padding = '18px';
  modal.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(54, 214, 181, 0.08)';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.gap = '12px';
  modal.style.color = '#eceff4';
  modal.style.fontFamily = 'system-ui, sans-serif';
  modal.style.position = 'relative';

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '10px';
  closeBtn.style.right = '12px';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.color = '#888';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.lineHeight = '1';
  closeBtn.addEventListener('click', () => overlay.remove());

  // Header
  const title = document.createElement('div');
  title.style.fontSize = '1.15rem';
  title.style.fontWeight = 'bold';
  title.style.color = '#fff';
  title.innerHTML = isPro ? '⭐ Context Copilot Pro' : '⭐ Unlock Context Copilot Pro';

  modal.appendChild(closeBtn);
  modal.appendChild(title);

  // Trigger reason banner if present
  if (triggerReason && !isPro) {
    const reasonEl = document.createElement('div');
    reasonEl.style.padding = '6px 8px';
    reasonEl.style.background = 'rgba(191, 97, 106, 0.1)';
    reasonEl.style.border = '1px solid #bf616a';
    reasonEl.style.borderRadius = '4px';
    reasonEl.style.fontSize = '0.8rem';
    reasonEl.style.color = '#ebcb8b';
    reasonEl.textContent = triggerReason;
    modal.appendChild(reasonEl);
  }

  if (isPro) {
    // Pro active view
    const statusText = document.createElement('div');
    statusText.style.fontSize = '0.85rem';
    statusText.style.color = '#a3be8c';
    statusText.style.fontWeight = '600';
    statusText.textContent = '✓ Your Pro subscription is active!';

    const details = document.createElement('div');
    details.style.fontSize = '0.78rem';
    details.style.color = '#aaa';
    details.style.lineHeight = '1.5';
    details.style.wordBreak = 'break-all';

    const maskedKey = licenseState?.license_key ? `${licenseState.license_key.slice(0, 8)}...` : 'Active';
    details.innerHTML = `
      <strong>Key:</strong> ${maskedKey}<br>
      <strong>Email:</strong> ${licenseState?.customer_email || 'Linked'}<br>
      ${licenseState?.expires_at ? `<strong>Renews:</strong> ${new Date(licenseState.expires_at).toLocaleDateString()}` : ''}
    `;

    const deactivateBtn = document.createElement('button');
    deactivateBtn.textContent = 'Deactivate on this Device';
    deactivateBtn.style.padding = '6px 10px';
    deactivateBtn.style.background = '#3b4252';
    deactivateBtn.style.color = '#e5e9f0';
    deactivateBtn.style.border = '1px solid #4c566a';
    deactivateBtn.style.borderRadius = '4px';
    deactivateBtn.style.cursor = 'pointer';
    deactivateBtn.style.fontSize = '0.8rem';
    deactivateBtn.style.marginTop = '8px';

    deactivateBtn.addEventListener('click', async () => {
      deactivateBtn.textContent = 'Deactivating...';
      deactivateBtn.disabled = true;
      await deactivateLicense();
      overlay.remove();
      // Re-trigger modal in Free state
      openProModal(sidebarContainer);
    });

    modal.append(statusText, details, deactivateBtn);
  } else {
    // Free / Upgrade view
    const featureList = document.createElement('div');
    featureList.style.display = 'flex';
    featureList.style.flexDirection = 'column';
    featureList.style.gap = '6px';
    featureList.style.fontSize = '0.82rem';
    featureList.style.color = '#d8dee9';

    const features = [
      '♾️ Unlimited Sessions & Notes',
      '📂 User-Named Grouping & Accordions',
      '🎯 Drag-and-Drop Card Organization',
      '⚡ Priority Context Injection'
    ];
    features.forEach(f => {
      const item = document.createElement('div');
      item.textContent = f;
      featureList.appendChild(item);
    });

    // Checkout CTA button
    const getProBtn = document.createElement('a');
    getProBtn.href = LEMON_CHECKOUT_URL;
    getProBtn.target = '_blank';
    getProBtn.textContent = 'Get Pro License Key →';
    getProBtn.style.display = 'block';
    getProBtn.style.textAlign = 'center';
    getProBtn.style.padding = '8px 12px';
    getProBtn.style.background = '#36d6b5';
    getProBtn.style.color = '#12141a';
    getProBtn.style.textDecoration = 'none';
    getProBtn.style.borderRadius = '8px';
    getProBtn.style.fontWeight = '600';
    getProBtn.style.fontSize = '0.85rem';
    getProBtn.style.marginTop = '4px';
    getProBtn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
    getProBtn.style.boxShadow = '0 4px 14px rgba(54, 214, 181, 0.25)';

    // License activation form
    const keySection = document.createElement('div');
    keySection.style.borderTop = '1px solid #2a2d38';
    keySection.style.paddingTop = '10px';
    keySection.style.display = 'flex';
    keySection.style.flexDirection = 'column';
    keySection.style.gap = '6px';

    const keyLabel = document.createElement('div');
    keyLabel.style.fontSize = '0.78rem';
    keyLabel.style.color = '#aaa';
    keyLabel.textContent = 'Already have a license key?';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Paste key (XXXX-XXXX-XXXX)...';
    keyInput.style.padding = '6px 8px';
    keyInput.style.background = '#12141a';
    keyInput.style.color = '#fff';
    keyInput.style.border = '1px solid #2a2d38';
    keyInput.style.borderRadius = '6px';
    keyInput.style.fontSize = '0.8rem';
    keyInput.style.boxSizing = 'border-box';
    keyInput.style.width = '100%';

    const keyError = document.createElement('div');
    keyError.style.fontSize = '0.75rem';
    keyError.style.color = '#bf616a';
    keyError.style.display = 'none';

    const activateBtn = document.createElement('button');
    activateBtn.textContent = 'Activate License';
    activateBtn.style.padding = '6px 10px';
    activateBtn.style.background = '#2a2d38';
    activateBtn.style.color = '#fff';
    activateBtn.style.border = '1px solid rgba(54, 214, 181, 0.2)';
    activateBtn.style.borderRadius = '6px';
    activateBtn.style.fontSize = '0.8rem';
    activateBtn.style.cursor = 'pointer';
    activateBtn.style.fontWeight = '500';

    activateBtn.addEventListener('click', async () => {
      const key = keyInput.value.trim();
      if (!key) {
        keyError.textContent = 'Please enter your license key.';
        keyError.style.display = 'block';
        return;
      }

      activateBtn.textContent = 'Activating...';
      activateBtn.disabled = true;
      keyError.style.display = 'none';

      const res = await activateLicense(key);
      if (res.success) {
        overlay.remove();
        // Show success alert or brief toast
        alert('🎉 Context Copilot Pro successfully activated! Enjoy unlimited memory.');
      } else {
        activateBtn.textContent = 'Activate License';
        activateBtn.disabled = false;
        keyError.textContent = res.error || 'Activation failed.';
        keyError.style.display = 'block';
      }
    });

    keySection.append(keyLabel, keyInput, keyError, activateBtn);
    modal.append(featureList, getProBtn, keySection);
  }

  overlay.appendChild(modal);
  sidebarContainer.appendChild(overlay);
}
