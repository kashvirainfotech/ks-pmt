// Generates a plain SQL bundle for pgAdmin. Never connects to a database.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const objectFolders = ['tables', 'views', 'sequences', 'functions', 'procedures', 'triggers', 'indexes', 'inserts'];

export async function buildInstall(directory = root) {
  const manifest = await readFile(resolve(directory, 'install.psql'), 'utf8');
  const included = new Set();
  const output = [
    '-- GENERATED FILE: node dbscripts/build-install.mjs',
    '-- Edit the individual object files and regenerate; do not edit this bundle.',
    '-- Manual execution on a blank database only. Includes schema and seed data.',
  ];
  for (const line of manifest.replace(/\r\n/g, '\n').split('\n')) {
    if (line === '\\set ON_ERROR_STOP on') continue;
    if (line.startsWith('\\ir ')) {
      const name = line.slice(4).trim();
      const source = resolve(directory, name);
      const local = relative(directory, source);
      if (isAbsolute(local) || local.startsWith('..') || !objectFolders.includes(name.split('/')[0]) || !name.endsWith('.sql')) {
        throw new Error(`Invalid object file in install.psql: ${name}`);
      }
      if (included.has(name)) throw new Error(`Duplicate include: ${name}`);
      included.add(name);
      const sql = (await readFile(source, 'utf8')).replace(/\r\n/g, '\n').trim();
      if (/^\s*\\/m.test(sql)) throw new Error(`psql commands are not allowed inside object files: ${name}`);
      output.push(`\n-- BEGIN SOURCE: ${name}`, sql, `-- END SOURCE: ${name}\n`);
    } else {
      if (line.startsWith('\\')) throw new Error(`Unsupported psql command: ${line}`);
      output.push(line);
    }
  }
  // Fail rather than silently omit newly added objects from the installer.
  for (const folder of objectFolders) {
    let files;
    try {
      files = await readdir(resolve(directory, folder), { recursive: true });
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const file of files) {
      const name = `${folder}/${file.replaceAll('\\', '/')}`;
      if (file.endsWith('.sql') && !included.has(name)) throw new Error(`SQL file missing from install.psql: ${name}`);
    }
  }
  return { sql: output.join('\n').trimEnd() + '\n', count: included.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { sql, count } = await buildInstall();
  const destination = resolve(root, 'install.sql');
  await writeFile(destination, sql, 'utf8');
  console.log(`Generated ${destination} from ${count} object files. No SQL was executed.`);
}
