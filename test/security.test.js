'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isAppUrl, isSafeExternal } = require('../lib/security');

const APP_ORIGIN = 'https://aura-kinetic-erp.pages.dev';

test('isAppUrl accepts exact same-origin URLs', () => {
  assert.equal(isAppUrl('https://aura-kinetic-erp.pages.dev', APP_ORIGIN), true);
  assert.equal(isAppUrl('https://aura-kinetic-erp.pages.dev/app/members?tab=active#top', APP_ORIGIN), true);
  assert.equal(isAppUrl('https://aura-kinetic-erp.pages.dev/gate', APP_ORIGIN), true);
});

test('isAppUrl rejects other hosts, scheme mismatches, lookalikes, and dangerous schemes', () => {
  assert.equal(isAppUrl('https://example.com', APP_ORIGIN), false);
  assert.equal(isAppUrl('http://aura-kinetic-erp.pages.dev/app', APP_ORIGIN), false);
  assert.equal(isAppUrl('https://aura-kinetic-erp.pages.dev.evil.com/app', APP_ORIGIN), false);
  assert.equal(isAppUrl('https://evil-aura-kinetic-erp.pages.dev/app', APP_ORIGIN), false);
  assert.equal(isAppUrl('https://aura-kinetic-erp.pages.dev@evil.com/app', APP_ORIGIN), false);
  assert.equal(isAppUrl('javascript:alert(1)', APP_ORIGIN), false);
  assert.equal(isAppUrl('data:text/html,<h1>hi</h1>', APP_ORIGIN), false);
  assert.equal(isAppUrl('file:///etc/passwd', APP_ORIGIN), false);
  assert.equal(isAppUrl('', APP_ORIGIN), false);
  assert.equal(isAppUrl(null, APP_ORIGIN), false);
});

test('isSafeExternal allows only https:, mailto:, and tel:', () => {
  assert.equal(isSafeExternal('https://example.com/docs'), true);
  assert.equal(isSafeExternal('mailto:support@aurakinetic.eg'), true);
  assert.equal(isSafeExternal('tel:+201012345678'), true);
});

test('isSafeExternal rejects http:, javascript:, file:, data:, and invalid inputs', () => {
  assert.equal(isSafeExternal('http://example.com'), false);
  assert.equal(isSafeExternal('javascript:alert(1)'), false);
  assert.equal(isSafeExternal('file:///etc/passwd'), false);
  assert.equal(isSafeExternal('data:text/plain,hello'), false);
  assert.equal(isSafeExternal('ftp://example.com/file'), false);
  assert.equal(isSafeExternal(''), false);
  assert.equal(isSafeExternal(undefined), false);
});
