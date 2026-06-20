import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const repository = 'Adamant-im/adamant-wallets';
const revision = '54a820b6dc5e0ec77c3a6fbac91d2f7809a2f5b7';
const target = fileURLToPath(new URL('../src/metadata/wallets.json', import.meta.url));
const coins = {
  ADM: 'adamant',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  DASH: 'dash',
  DOGE: 'doge',
};
const fields = [
  'name',
  'nameShort',
  'website',
  'explorer',
  'explorerTx',
  'explorerAddress',
  'regexAddress',
  'symbol',
  'type',
  'decimals',
  'cryptoTransferDecimals',
  'status',
  'createCoin',
  'defaultVisibility',
  'defaultOrdinalLevel',
];

const metadata = {};

for (const [symbol, directory] of Object.entries(coins)) {
  const url = `https://raw.githubusercontent.com/${repository}/${revision}/assets/general/${directory}/info.json`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Unable to fetch ${symbol} metadata: ${response.status} ${response.statusText}`);
  }

  const upstream = await response.json();
  metadata[symbol] = Object.fromEntries(
    fields.filter((field) => upstream[field] !== undefined).map((field) => [field, upstream[field]])
  );
}

const output = `${JSON.stringify({source: {repository, revision}, coins: metadata}, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8');

  if (current !== output) {
    throw new Error('Wallet metadata is out of sync. Run `pnpm metadata:sync`.');
  }

  console.log(`Wallet metadata matches ${repository}@${revision}.`);
} else {
  await writeFile(target, output);
  console.log(`Updated wallet metadata from ${repository}@${revision}.`);
}
