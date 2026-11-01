import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('HTML versions its stylesheet and module to avoid mixed cached releases', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  for (const file of ['style.css', 'app.mjs']) {
    const hash = createHash('sha256').update(readFileSync(new URL(file, import.meta.url))).digest('hex').slice(0, 12);
    assert.ok(html.includes(`./${file}?v=${hash}"`), `Update ${file}'s content version in index.html when it changes`);
    assert.ok(!html.includes(`./${file}"`), `${file} must not use the unversioned cached URL`);
  }
});
