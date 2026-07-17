import assert from 'node:assert/strict';

import {
  AdamantApi,
  WebSocketClient,
  admToSats,
  createKeypairFromPassphrase,
  type AdamantAddress,
  type BalanceField,
  type ClientWebSocketNewBlock,
  type DelegateDto,
  type GetBlocksOptions,
  type GetNodeStatusResponseDto,
  type NetworkStatus,
  type SearchDelegateDto,
  type TransactionDirection,
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
const direction: TransactionDirection = 'incoming';
const balanceField: BalanceField = 'balance';
const exactBlockAmountFilter: GetBlocksOptions = {
  totalAmount: '9800000000000000',
};
const delegateForged: DelegateDto['forged'] = '195607450000000';
const consensusCodeName: NetworkStatus['consensusCodeName'] = null;
const consensusSchedule: GetNodeStatusResponseDto['consensusSchedule'] = {
  activationHeights: {fairSystem: 4359465},
};
const milestoneSchedule: GetNodeStatusResponseDto['milestoneSchedule'] = {
  offset: 2000000,
  distance: 6300000,
  milestones: [50000000, 45000000],
};
type SearchDelegateOmitsForged = 'forged' extends keyof SearchDelegateDto
  ? false
  : true;
const searchDelegateOmitsForged: SearchDelegateOmitsForged = true;
const api = new AdamantApi({
  nodes: ['https://node.example'],
  checkHealthAtStartup: false,
  logLevel: 'debug',
});

assert.equal(AdamantApi, ExplicitAdamantApi);
assert.equal(AdamantApi, ApiEntryAdamantApi);
assert.equal(api.node, 'https://node.example');
assert.equal(address, 'U123456');
assert.equal(direction, 'incoming');
assert.equal(balanceField, 'balance');
assert.equal(exactBlockAmountFilter.totalAmount, '9800000000000000');
assert.equal(delegateForged, '195607450000000');
assert.equal(consensusCodeName, null);
assert.equal(consensusSchedule.activationHeights.fairSystem, 4359465);
assert.deepEqual(milestoneSchedule.milestones, [50000000, 45000000]);
assert.equal(searchDelegateOmitsForged, true);
assert.equal(typeof api.getTopAccounts, 'function');
assert.equal(typeof api.searchDelegates, 'function');
const ws = new WebSocketClient({admAddress: address})
  .onNewBlock((block: ClientWebSocketNewBlock) => {
    void block.height;
  })
  .onBalanceChange(balanceField, change => {
    void change.balance;
  });
assert.equal(typeof ws.onNewBlock, 'function');
assert.equal(typeof ws.onBalanceChange, 'function');
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
