const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const api = require('../build/utils/api.js');
const { registerCardsTools } = require('../build/tools/cards.js');

test('download tool confines attachments and manifest; handles defaults, filtering, errors and repeats', async t => {
  const base = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), 'trello-tool-test-'));
  const root = path.join(base, 'downloads');
  const previousRoot = process.env.TRELLO_DOWNLOAD_ROOT;
  const previousFetch = api.fetchWithRetry;
  t.after(async () => {
    api.fetchWithRetry = previousFetch;
    if (previousRoot === undefined) delete process.env.TRELLO_DOWNLOAD_ROOT;
    else process.env.TRELLO_DOWNLOAD_ROOT = previousRoot;
    await fs.rm(base, { recursive: true, force: true });
  });
  process.env.TRELLO_DOWNLOAD_ROOT = root;
  let handler, schema;
  registerCardsTools({ tool(name, input, fn) {
    if (name === 'download-card-attachments') { handler = fn; schema = input; }
  } }, { apiKey: 'fake-key', apiToken: 'fake-token' });
  const attachments = [
    { id: 'a1', name: '../../escape.png', mimeType: 'image/png', url: 'https://example.invalid/image', date: '2026-11-10' },
    { id: 'a2', name: 'notes.txt', mimeType: 'text/plain', url: 'https://example.invalid/text' }
  ];
  let requests = 0;
  api.fetchWithRetry = async url => {
    requests++;
    if (url.includes('/attachments?')) return { json: async () => attachments };
    if (url.includes('/actions?')) return { json: async () => [{ data: { text: 'See a1' } }] };
    if (url.startsWith('https://api.trello.com/')) return { json: async () => ({ name: 'Card', desc: 'Description', shortUrl: 'https://trello.com/c/example' }) };
    return { arrayBuffer: async () => Buffer.from('contents') };
  };
  for (const savePath of ['../escape', '/tmp/escape', 'C:\\escape', 'a/b']) {
    assert.equal(schema.savePath.safeParse(savePath).success, false);
    assert.equal((await handler({ cardId: 'card', savePath })).isError, true);
  }
  assert.equal(requests, 0, 'invalid input is rejected before network or disk access');
  await assert.rejects(fs.stat(root), { code: 'ENOENT' });
  const run = async args => {
    const response = await handler({ cardId: 'card', ...args });
    assert.notEqual(response.isError, true, response.content[0].text);
    return JSON.parse(response.content[0].text);
  };
  const first = await run({ savePath: 'my-card' });
  const second = await run({ savePath: 'my-card', imagesOnly: false });
  const defaultResult = await run({});
  assert.equal(path.dirname(first.savedTo), root);
  assert.notEqual(first.savedTo, second.savedTo);
  assert.match(path.basename(defaultResult.savedTo), /^attachments-/);
  assert.equal(first.filesDownloaded, 1);
  assert.equal(second.filesDownloaded, 2);
  const manifest = JSON.parse(await fs.readFile(path.join(first.savedTo, '_manifest.json'), 'utf8'));
  assert.equal(manifest.files[0].originalName, '../../escape.png');
  assert.equal(manifest.files[0].commentContext, 'See a1');
  assert.equal(manifest.files[0].bytes, 8);
  assert.equal(await fs.readFile(path.join(first.savedTo, first.files[0].file), 'utf8'), 'contents');
  assert.deepEqual(await fs.readdir(base), ['downloads']);
  api.fetchWithRetry = async () => { throw new Error('simulated failure'); };
  const failed = await handler({ cardId: 'card' });
  assert.equal(failed.isError, true);
  assert.match(failed.content[0].text, /simulated failure/);
});
