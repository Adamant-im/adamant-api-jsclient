import {doge} from '../doge';
import {passphrase} from './mock/passphrase';

describe('doge.keys()', () => {
  test('should create keys with doge network and address/privateKey for the passphrase', () => {
    const keys = doge.keys(passphrase);

    expect(keys).toMatchObject({
      address: 'D7zQbHUEjiPRie6v9WCsC3DNwDifUdbFdd',
      privateKey:
        '0c9c84722d74ae5c5ba52f74285807ef08085a66aa7b23377fa8cdd51f1ecff3',
      privateKeyWIF: 'QP39CeEExXMvsFLHToa2ANgnt3K3iJhgAyyU52Pm4F8nBniweSFq',
      network: {
        name: 'Dogecoin',
        unit: 'DOGE',
      },
    });
  });
});
