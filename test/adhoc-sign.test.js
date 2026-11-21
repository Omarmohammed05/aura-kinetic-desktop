'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const adhocSign = require('../scripts/adhoc-sign').default;

test('adhoc-sign skips non-darwin platforms without invoking codesign', async () => {
  await assert.doesNotReject(() =>
    adhocSign({
      electronPlatformName: 'win32',
      appOutDir: '/tmp/dist/win-unpacked',
      packager: { appInfo: { productFilename: 'Aura Kinetic' } },
    })
  );
});

test('adhoc-sign skips intermediate universal -temp directories without invoking codesign', async () => {
  for (const dir of ['/tmp/dist/mac-universal-x64-temp', '/tmp/dist/mac-universal-arm64-temp']) {
    await assert.doesNotReject(() =>
      adhocSign({
        electronPlatformName: 'darwin',
        appOutDir: dir,
        packager: { appInfo: { productFilename: 'Aura Kinetic' } },
      })
    );
  }
});

test('adhoc-sign skips when CSC_LINK signing certificate is configured', async () => {
  const prev = process.env.CSC_LINK;
  process.env.CSC_LINK = 'file:///fake-cert.p12';
  try {
    await assert.doesNotReject(() =>
      adhocSign({
        electronPlatformName: 'darwin',
        appOutDir: '/tmp/dist/mac-universal',
        packager: { appInfo: { productFilename: 'Aura Kinetic' } },
      })
    );
  } finally {
    if (prev === undefined) delete process.env.CSC_LINK;
    else process.env.CSC_LINK = prev;
  }
});
