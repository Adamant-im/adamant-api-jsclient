import {coinMetadata, walletMetadataSource} from '../index';

describe('wallet metadata', () => {
  test('is pinned to a reproducible adamant-wallets revision', () => {
    expect(walletMetadataSource).toEqual({
      repository: 'Adamant-im/adamant-wallets',
      revision: '54a820b6dc5e0ec77c3a6fbac91d2f7809a2f5b7',
    });
  });

  test.each(['ADM', 'BTC', 'ETH', 'DASH', 'DOGE'] as const)(
    'contains usable metadata for %s',
    symbol => {
      const metadata = coinMetadata[symbol];

      expect(metadata.symbol).toBe(symbol);
      expect(metadata.status).toBe('active');
      expect(metadata.decimals).toBeGreaterThan(0);
      expect(() => new RegExp(metadata.regexAddress)).not.toThrow();
    },
  );
});
