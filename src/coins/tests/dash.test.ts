import {dash} from '../dash';
import {passphrase} from './mock/passphrase';

describe('dash.keys()', () => {
  test('should create keys with dash network and address/privateKey for the passphrase', () => {
    const keys = dash.keys(passphrase);

    expect(keys).toMatchObject({
      address: 'XdY9tHBVQ1hjLaWuGoXXVojZtRa4GfEdNP',
      privateKey:
        '0c9c84722d74ae5c5ba52f74285807ef08085a66aa7b23377fa8cdd51f1ecff3',
      privateKeyWIF: 'XBi9W4od1bWFh3wcuHj6nP3CL2Z47ZB7fJdTovL7eFoX91tC1QD4',
      network: {
        name: 'Dash',
        unit: 'DASH',
      },
    });
  });
});
