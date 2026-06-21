import {execFileSync} from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'adamant-api-package-'));
const packedDirectory = join(temporaryRoot, 'packed');
const consumerDirectory = join(temporaryRoot, 'consumer');

const consumerFixture = join(
  projectRoot,
  'scripts',
  'package-test',
  'consumer.ts',
);
const liveEsmConsumerFixture = join(
  projectRoot,
  'scripts',
  'package-test',
  'consumer_live_esm.ts',
);
const liveCommonJsConsumerFixture = join(
  projectRoot,
  'scripts',
  'package-test',
  'consumer_live_common.js',
);

const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    stdio: 'inherit',
  });

try {
  mkdirSync(packedDirectory);
  mkdirSync(consumerDirectory);

  console.log('Packing the current working tree...');
  run('pnpm', ['pack', '--pack-destination', packedDirectory], projectRoot);

  const archives = readdirSync(packedDirectory).filter(file =>
    file.endsWith('.tgz'),
  );

  if (archives.length !== 1) {
    throw new Error(`Expected one package archive, found ${archives.length}`);
  }

  const archive = join(packedDirectory, archives[0]);

  writeFileSync(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'adamant-api-package-test',
        private: true,
        type: 'module',
      },
      null,
      2,
    )}\n`,
  );

  console.log('Installing the local archive into a temporary project...');
  run(
    'npm',
    [
      'install',
      archive,
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--loglevel=error',
    ],
    consumerDirectory,
  );

  copyFileSync(consumerFixture, join(consumerDirectory, 'consumer.ts'));
  copyFileSync(
    liveEsmConsumerFixture,
    join(consumerDirectory, 'consumer_live_esm.ts'),
  );

  const commonJsConsumerDirectory = join(consumerDirectory, 'commonjs');
  mkdirSync(commonJsConsumerDirectory);
  copyFileSync(
    liveCommonJsConsumerFixture,
    join(commonJsConsumerDirectory, 'consumer_live_common.js'),
  );
  writeFileSync(
    join(commonJsConsumerDirectory, 'package.json'),
    `${JSON.stringify({private: true, type: 'commonjs'}, null, 2)}\n`,
  );

  writeFileSync(
    join(consumerDirectory, 'consumer.cjs'),
    `const assert = require('node:assert/strict');
const root = require('adamant-api');
const {btc} = require('adamant-api/coins/btc');

assert.equal(typeof root.AdamantApi, 'function');
assert.equal(typeof root.getTransactionId, 'function');
assert.equal(typeof btc.isValidAddress, 'function');

console.log('CommonJS package imports passed.');
`,
  );

  writeFileSync(
    join(consumerDirectory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: 'ES2022',
          module: 'Node16',
          moduleResolution: 'Node16',
          skipLibCheck: false,
          types: ['node'],
          typeRoots: [join(projectRoot, 'node_modules', '@types')],
        },
        include: ['consumer.ts', 'consumer_live_esm.ts'],
      },
      null,
      2,
    )}\n`,
  );

  console.log('\nTesting the installed package...');
  run(
    process.execPath,
    ['--experimental-strip-types', 'consumer.ts'],
    consumerDirectory,
  );
  run(
    process.execPath,
    [
      '--experimental-strip-types',
      '--eval',
      "import('./consumer_live_esm.ts').then(() => process.exit(0))",
    ],
    consumerDirectory,
  );
  run(
    process.execPath,
    [
      '--eval',
      "Promise.resolve(require('./consumer_live_common.js')).then(() => process.exit(0))",
    ],
    commonJsConsumerDirectory,
  );
  run(process.execPath, ['consumer.cjs'], consumerDirectory);
  run(
    join(projectRoot, 'node_modules', '.bin', 'tsc'),
    ['--project', 'tsconfig.json'],
    consumerDirectory,
  );

  console.log('TypeScript package declarations passed.');
  console.log('Local package test passed.');
} finally {
  rmSync(temporaryRoot, {recursive: true, force: true});
}
