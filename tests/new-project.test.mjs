import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const script = fileURLToPath(new URL('../scripts/new-project.mjs', import.meta.url));
async function workspace(t) {
  const cwd = await mkdtemp(join(tmpdir(), 'cannon-project-test-'));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  return { cwd, run: (...args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' }) };
}
test('C01: a new project starts as a draft and preserves a supplied title', async t => {
  const { cwd, run } = await workspace(t);
  const result = run('new-world', '我的“新世界”');
  assert.equal(result.status, 0, result.stderr);
  const content = await readFile(join(cwd, 'src/content/projects/new-world.md'), 'utf8');
  assert.match(content, /^draft: true$/m);
  assert.match(content, /我的“新世界”/);
  assert.match(content, /^## 我的贡献$/m);
});
test('C02: creating the same slug cannot overwrite an existing project', async t => {
  const { cwd, run } = await workspace(t);
  assert.equal(run('existing', '原作品').status, 0);
  const path = join(cwd, 'src/content/projects/existing.md');
  const before = await readFile(path, 'utf8');
  assert.notEqual(run('existing', '覆盖内容').status, 0);
  assert.equal(await readFile(path, 'utf8'), before);
});
test('C03: invalid slugs cannot write outside the content directory', async t => {
  const { cwd, run } = await workspace(t);
  for (const slug of ['../escape', '/tmp/escape', 'bad/name', 'bad name', '']) assert.notEqual(run(slug).status, 0);
  assert.deepEqual(await readdir(cwd), []);
});
