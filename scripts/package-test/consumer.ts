import assert from 'node:assert/strict';

import {
  AdamantApi,
  admToSats,
  createKeypairFromPassphrase,
  type AdamantAddress,
} from 'adamant-api';
import {AdamantApi as ExplicitAdamantApi} from 'adamant-api/adm';
import {AdamantApi as ApiEntryAdamantApi} from 'adamant-api/api';
import {btc} from 'adamant-api/coins/btc';
import {dash} from 'adamant-api/coins/dash';
import {doge} from 'adamant-api/coins/doge';
import {eth} from 'adamant-api/coins/eth';
import {coinMetadata} from 'adamant-api/metadata';
import {getTransactionId} from 'adamant-api/transactions';

const address: AdamantAddress = 'U123456';
const api = new AdamantApi({
  nodes: ['https://node.example'],
  checkHealthAtStartup: false,
  logLevel: 'debug',
});

assert.equal(AdamantApi, ExplicitAdamantApi);
assert.equal(AdamantApi, ApiEntryAdamantApi);
assert.equal(api.node, 'https://node.example');
assert.equal(address, 'U123456');
assert.equal(admToSats(1.25), 125000000);
assert.equal(
  typeof createKeypairFromPassphrase(
    'package test passphrase with enough characters',
  ).publicKey,
  'object',
);
assert.equal(typeof getTransactionId, 'function');
assert.equal(coinMetadata.ADM.decimals, 8);
assert.equal(typeof btc.keys, 'function');
assert.equal(typeof dash.isValidAddress, 'function');
assert.equal(typeof doge.isValidAddress, 'function');
assert.equal(typeof eth.keys, 'function');

console.log('ESM package imports and runtime checks passed.');
