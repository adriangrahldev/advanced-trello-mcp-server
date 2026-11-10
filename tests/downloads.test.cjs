const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createDownloadDirectory, validateDownloadLabel, writeDownloadFile } = require('../build/utils/downloads.js');

async function fixture(t) {
  // Canonicalize OS temporary paths (e.g. /var -> /private/var on macOS).
  const base = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'trello-test-'));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  return base;
}

for (const value of ['', '.', '..', '../escape', 'a/../../escape', '/tmp/escape', 'a/b', 'a\\b', 'C:\\temp', 'C:temp', '\\\\server\\share', 'a\0b', '%2e%2e', 'a'.repeat(65)]) {
  test(`rejects unsafe savePath ${JSON.stringify(value)}`, async t => {
    const base = await fixture(t);
    assert.throws(() => validateDownloadLabel(value));
    await assert.rejects(createDownloadDirectory(path.join(base, 'root'), value));
    assert.deepEqual(await fs.readdir(base), []);
  });
}

test('creates isolated private directories for repeated and concurrent labels', async t => {
  const base = await fixture(t);
  const root = path.join(base, 'root');
  const dirs = await Promise.all(Array.from({ length: 8 }, () => createDownloadDirectory(root, 'card_123')));
  assert.equal(new Set(dirs).size, 8);
  for (const dir of dirs) {
    assert.equal(path.dirname(dir), root);
    if (process.platform !== 'win32') assert.equal((await fs.stat(dir)).mode & 0o777, 0o700);
  }
});

test('rejects symlinked root and ancestor without writing outside', async t => {
  const base = await fixture(t);
  const outside = path.join(base, 'outside');
  await fs.mkdir(outside);
  const link = path.join(base, 'link');
  await fs.symlink(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(createDownloadDirectory(link, 'card'));
  await assert.rejects(createDownloadDirectory(path.join(link, 'nested'), 'card'));
  assert.deepEqual(await fs.readdir(outside), []);
});

test('rejects existing non-directory root', async t => {
  const base = await fixture(t);
  const root = path.join(base, 'root');
  await fs.writeFile(root, 'original');
  await assert.rejects(createDownloadDirectory(root, 'card'));
  assert.equal(await fs.readFile(root, 'utf8'), 'original');
});

test('exclusive creation protects attachments and manifest, including hard links and dangling symlinks', async t => {
  const base = await fixture(t);
  const dir = await createDownloadDirectory(path.join(base, 'root'), 'card');
  for (const name of ['01-image.png', '_manifest.json']) {
    await writeDownloadFile(dir, name, 'original');
    await assert.rejects(writeDownloadFile(dir, name, 'replacement'), { code: 'EEXIST' });
    assert.equal(await fs.readFile(path.join(dir, name), 'utf8'), 'original');
  }
  const target = path.join(base, 'target');
  await fs.writeFile(target, 'outside');
  await fs.link(target, path.join(dir, 'hardlink'));
  await fs.symlink(target, path.join(dir, 'symlink'));
  await fs.symlink(path.join(base, 'missing'), path.join(dir, 'dangling'));
  for (const name of ['hardlink', 'symlink', 'dangling']) {
    await assert.rejects(writeDownloadFile(dir, name, 'replacement'), { code: 'EEXIST' });
  }
  assert.equal(await fs.readFile(target, 'utf8'), 'outside');
  await assert.rejects(fs.stat(path.join(base, 'missing')), { code: 'ENOENT' });
  if (process.platform !== 'win32') assert.equal((await fs.stat(path.join(dir, '01-image.png'))).mode & 0o777, 0o600);
});

test('writer rejects path names and symlinked output directory', async t => {
  const base = await fixture(t);
  const dir = await createDownloadDirectory(path.join(base, 'root'), 'card');
  for (const name of ['', '.', '..', '../escape', '/absolute', 'a\\b', 'a\0b']) {
    await assert.rejects(writeDownloadFile(dir, name, 'bad'));
  }
  const link = path.join(base, 'link');
  await fs.symlink(dir, link, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(writeDownloadFile(link, 'file', 'bad'));
  assert.deepEqual(await fs.readdir(dir), []);
});
