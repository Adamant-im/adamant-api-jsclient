import {eth} from '../eth';
import {passphrase} from './mock/passphrase';

describe('eth.keys()', () => {
  test('should create address and privateKey for the passphrase', () => {
    const keys = eth.keys(passphrase);

    expect(keys).toMatchObject({
      address: '0x6c892b27f6deb1c81ed0122b23193c5802464c2c',
      privateKey:
        '0x2a3d59f8cab3c8b90d2e841c85872d0a78c75ac8d0b74186f856b3e954121277',
    });
  });
});
