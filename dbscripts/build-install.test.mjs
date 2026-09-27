import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, sep } from 'node:path';
import { buildInstall } from './build-install.mjs';

test('bundle includes all canonical SQL once, in manifest order, in one transaction', async () => {
  const { sql, count } = await buildInstall();
  const manifest = await readFile(new URL('./install.psql', import.meta.url), 'utf8');
  const names = [...manifest.matchAll(/^\\ir (.+)$/gm)].map(match => match[1].trim());
  assert.equal(count, names.length);
  assert.equal(new Set(names).size, count);
  assert(!/^\s*\\/m.test(sql), 'pgAdmin bundle contains no psql commands');
  assert.equal((sql.match(/^BEGIN;$/gm) || []).length, 1);
  assert.equal((sql.match(/^COMMIT;$/gm) || []).length, 1);
  let previous = -1;
  for (const name of names) {
    const canonical = (await readFile(new URL(name, import.meta.url), 'utf8')).replace(/\r\n/g, '\n').trim();
    const index = sql.indexOf(`-- BEGIN SOURCE: ${name}\n${canonical}\n-- END SOURCE: ${name}`);
    assert(index > previous, `${name} preserved verbatim and in order`);
    previous = index;
  }
  assert.equal((await buildInstall()).sql, sql, 'generation is deterministic');
});

test('bundle rejects omitted, duplicate, missing, and escaping source files', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'ks-pmt-bundle-test-'));
  try {
    await mkdir(resolve(directory, 'tables'));
    await writeFile(resolve(directory, 'tables/example.sql'), 'CREATE TABLE example (id INTEGER);');
    const manifest = resolve(directory, 'install.psql');
    await writeFile(manifest, 'BEGIN;\nCOMMIT;');
    await assert.rejects(buildInstall(directory), /missing from install.psql/);
    await writeFile(manifest, '\\ir tables/example.sql\n\\ir tables/example.sql');
    await assert.rejects(buildInstall(directory), /Duplicate include/);
    await writeFile(manifest, '\\ir tables/missing.sql');
    await assert.rejects(buildInstall(directory), /ENOENT/);
    await writeFile(manifest, '\\ir ../outside.sql');
    await assert.rejects(buildInstall(directory), /Invalid object file/);
    await writeFile(manifest, '\\unknown');
    await assert.rejects(buildInstall(directory), /Unsupported psql command/);
  } finally {
    assert(directory.startsWith(resolve(tmpdir()) + sep + 'ks-pmt-bundle-test-'));
    await rm(directory, { recursive: true });
  }
});
