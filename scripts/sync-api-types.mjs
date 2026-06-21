import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repository = 'Adamant-im/adamant-schema';
const revision = '8432b267a847864d3dd3218f59991159b9a6a3f6';
const bundlerVersion = '2.34.0';
const generatorVersion = '13.12.2';
const target = fileURLToPath(new URL('../src/api/generated.ts', import.meta.url));
const schemaUrl = `https://raw.githubusercontent.com/${repository}/${revision}/specification/openapi.yaml`;

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const executable = process.platform === 'win32' ? `${command}.cmd` : command;
    const child = spawn(executable, args, {stdio: 'inherit'});

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`,
          ),
        );
      }
    });
  });

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'adamant-api-types-'));

try {
  const schemaPath = path.join(temporaryDirectory, 'schema.json');
  const outputDirectory = path.join(temporaryDirectory, 'generated');

  await run('redocly', [
    'bundle',
    schemaUrl,
    '-o',
    schemaPath,
    '--component-renaming-conflicts-severity=off',
  ]);
  await run('swagger-typescript-api', [
    'generate',
    '-p',
    schemaPath,
    '-o',
    outputDirectory,
    '-n',
    'generated.ts',
    '--no-client',
  ]);

  const generated = await readFile(path.join(outputDirectory, 'generated.ts'), 'utf8');
  const sourceHeader = [
    `// Schema source: https://github.com/${repository}/tree/${revision}`,
    `// Bundler: @redocly/cli@${bundlerVersion}`,
    `// Generator: swagger-typescript-api@${generatorVersion}`,
  ].join('\n');
  const output = generated
    .replace('// @ts-nocheck\n', '')
    .replace(
      '/* eslint-disable */\n',
      `/* eslint-disable */\n${sourceHeader}\n`,
    );

  if (process.argv.includes('--check')) {
    const current = await readFile(target, 'utf8');

    if (current !== output) {
      throw new Error('Generated API types are out of sync. Run `pnpm api-types:sync`.');
    }

    console.log(`API types match ${repository}@${revision}.`);
  } else {
    await writeFile(target, output);
    console.log(`Updated API types from ${repository}@${revision}.`);
  }
} finally {
  await rm(temporaryDirectory, {recursive: true, force: true});
}
