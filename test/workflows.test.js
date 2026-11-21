'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');

test('release.yml defines v* tag trigger, write perms, mac+win matrix, tag check, SHA256SUMS, and release publish', () => {
  const src = fs.readFileSync(path.join(ROOT, '.github/workflows/release.yml'), 'utf8');
  assert.match(src, /tags:\s*\n\s*-\s*'v\*'/);
  assert.match(src, /contents:\s*write/);
  assert.equal(src.includes('macos-latest'), true);
  assert.equal(src.includes('windows-latest'), true);
  assert.equal(src.includes('dist:mac'), true);
  assert.equal(src.includes('dist:win'), true);
  assert.equal(src.includes('if-no-files-found: error'), true);
  assert.equal(src.includes('SHA256SUMS.txt'), true);
  assert.equal(src.includes('generate_release_notes: true'), true);
  assert.equal(src.includes('GITHUB_REF_NAME'), true);
});

test('ci.yml runs npm ci and npm test on pull requests with minimal read permissions', () => {
  const src = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  assert.equal(src.includes('pull_request:'), true);
  assert.match(src, /contents:\s*read/);
  assert.equal(src.includes('npm ci'), true);
  assert.equal(src.includes('npm test'), true);
});
