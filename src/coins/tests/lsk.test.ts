import {lsk} from '../lsk';
import {passphrase} from './mock/passphrase';

describe('eth.keys()', () => {
  test('should create address and privateKey for the passphrase', () => {
    const keys = lsk.keys(passphrase);

    expect(keys).toMatchObject({
      address: 'lsk53o76hxv9kkc4cq7239gbgtgjhq6uswgt5aqxc',
      addressHex: '5a18e574226d28348eaec21bf37e7fe76aa86eff',
      privateKey:
        'b0ec632b3ceb31dd2f1cfa8d3c16086f0d14c1344a126d0136bca3bf00d4fc1dddf501ed87c5d950241622ca678a7a96f59e63aa1a0ef89d4a6bbf096ba00471',
      network: {
        name: 'Lisk',
        unit: 'LSK',
      },
    });
  });
});
