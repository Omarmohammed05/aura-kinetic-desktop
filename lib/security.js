'use strict';

/**
 * Pure URL security helpers for Aura Kinetic Desktop.
 * Exported independently so they can be unit-tested with node:test.
 */

function isAppUrl(url, appOrigin) {
  if (typeof url !== 'string' || typeof appOrigin !== 'string') return false;
  if (!url.trim() || !appOrigin.trim()) return false;
  try {
    const target = new URL(url);
    const allowed = new URL(appOrigin);
    if (allowed.protocol !== 'https:' && allowed.protocol !== 'http:') return false;
    if (target.protocol !== allowed.protocol) return false;
    return target.origin === allowed.origin;
  } catch {
    return false;
  }
}

function isSafeExternal(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:';
  } catch {
    return false;
  }
}

module.exports = {
  isAppUrl,
  isSafeExternal,
};
