import {execFileSync} from 'node:child_process';
import {
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

  writeFileSync(
    join(consumerDirectory, 'consumer.mjs'),
    `import assert from 'node:assert/strict';
import {AdamantApi, admToSats, createKeypairFromPassphrase} from 'adamant-api';
import {AdamantApi as ExplicitAdamantApi} from 'adamant-api/adm';
import {AdamantApi as ApiEntryAdamantApi} from 'adamant-api/api';
import {getTransactionId} from 'adamant-api/transactions';
import {coinMetadata} from 'adamant-api/metadata';
import {btc} from 'adamant-api/coins/btc';
import {dash} from 'adamant-api/coins/dash';
import {doge} from 'adamant-api/coins/doge';
import {eth} from 'adamant-api/coins/eth';

assert.equal(AdamantApi, ExplicitAdamantApi);
assert.equal(AdamantApi, ApiEntryAdamantApi);
assert.equal(admToSats(1.25), 125000000);
assert.equal(typeof createKeypairFromPassphrase('package test passphrase with enough characters').publicKey, 'object');
assert.equal(typeof getTransactionId, 'function');
assert.equal(coinMetadata.ADM.decimals, 8);
assert.equal(typeof btc.keys, 'function');
assert.equal(typeof dash.isValidAddress, 'function');
assert.equal(typeof doge.isValidAddress, 'function');
assert.equal(typeof eth.keys, 'function');

const api = new AdamantApi({nodes: ['https://node.example'], checkHealthAtStartup: false});
assert.equal(api.node, 'https://node.example');

console.log('ESM package imports passed.');
`,
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
    join(consumerDirectory, 'consumer.ts'),
    `import {AdamantApi, type AdamantAddress} from 'adamant-api';
import {btc} from 'adamant-api/coins/btc';

const address: AdamantAddress = 'U123456';
const api = new AdamantApi({
  nodes: ['https://node.example'],
  checkHealthAtStartup: false,
});

void address;
void api;
void btc.isValidAddress('1BoatSLRHtKNngkdXEeobR76b53LETtpyT');
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
        include: ['consumer.ts'],
      },
      null,
      2,
    )}\n`,
  );

  console.log('Testing the installed package...');
  run(process.execPath, ['consumer.mjs'], consumerDirectory);
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
