import {btc} from '../btc';
import {passphrase} from './mock/passphrase';

describe('btc.keys()', () => {
  test('should create keys with bitcoin network and address/privateKey for the passphrase', () => {
    const keys = btc.keys(passphrase);

    expect(keys).toMatchObject({
      address: '13rK42XbSJV9BdvKQvDJeH3n45zNBbXsUV',
      privateKey:
        '0c9c84722d74ae5c5ba52f74285807ef08085a66aa7b23377fa8cdd51f1ecff3',
      privateKeyWIF: 'KweE3oRFhusodiwEsXjEH9rBR1HUfkZsHjHZHPzvKtXRjroArofw',
      network: {
        name: 'Bitcoin',
        unit: 'BTC',
      },
    });
  });
});
