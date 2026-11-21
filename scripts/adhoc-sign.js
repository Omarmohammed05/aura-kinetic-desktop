'use strict';

const path = require('node:path');
const { execFileSync } = require('node:child_process');

/**
 * electron-builder afterPack hook.
 * Applies an ad-hoc signature on macOS builds when no Apple Developer certificate
 * (CSC_LINK) is configured so the universal binary launches on Apple Silicon.
 */
exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') {
    console.log(`[adhoc-sign] Skipping on non-macOS platform (${context.electronPlatformName}).`);
    return;
  }

  if (process.env.CSC_LINK && process.env.CSC_LINK.trim().length > 0) {
    console.log('[adhoc-sign] CSC_LINK is set; skipping ad-hoc signature in favor of real signing.');
    return;
  }

  const productFilename = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${productFilename}.app`);
  console.log(`[adhoc-sign] Applying ad-hoc codesign to ${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
  console.log('[adhoc-sign] Ad-hoc signature completed.');
};
