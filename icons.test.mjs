import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const arrow = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
const helpers = [
  ['print', /<button id="print"[^>]*>([\s\S]*?)<\/button>/, 'Print plan', 'M2 10 10 2M3 2h7v7'],
  ['mixed', /<button class="button dark" id="mixed">([\s\S]*?)<\/button>/, 'Try a mixed layout', 'M2 10 10 2M3 2h7v7'],
  ['room help', /<p class="room-help">([\s\S]*?)<\/p>/, 'Select a pot to move it or change its treatment. Keyboard and touch work too.', 'M2 2v6h8M7 5l3 3-3 3'],
];
for (const [name, pattern, label, path] of helpers) {
  test(`${name} has a small font-independent decorative arrow and unchanged text`, () => {
    const content = html.match(pattern)?.[1];
    assert.ok(content, `Missing ${name}`);
    assert.equal((content.match(/<svg /g) || []).length, 1);
    assert.ok(content.includes(`${arrow}<path d="${path}" /></svg>`), 'Use a bounded, self-contained, non-focusable currentColor vector');
    assert.equal(content.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/\s+/g, ' ').trim(), label);
    assert.doesNotMatch(content, /[↗↳]|<title|<text|<use|<image|tabindex|on\w+=/);
  });
}
test('only the three broken decorative glyphs are replaced; brand marks remain', () => {
  assert.doesNotMatch(html, /[↗↳]/);
  assert.equal((html.match(/<svg /g) || []).length, 3);
  assert.equal((html.match(/✳/g) || []).length, 2);
  assert.ok(html.includes('<span class="brand-mark" aria-hidden="true">✳</span>'));
  assert.match(html, /<span class="brand">TrialMap <span aria-hidden="true">✳<\/span><\/span\s*>/);
});
