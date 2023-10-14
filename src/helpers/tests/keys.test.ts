import * as keys from '../keys';
import {mocked} from './mock-data/address';

describe('createNewPassphrase', () => {
  test('should return string that contains more than 11 words', () => {
    const passphrase = keys.createNewPassphrase();

    expect(typeof passphrase).toBe('string');
    expect(passphrase.split(' ').length).toBeGreaterThanOrEqual(12);
  });
});

describe('makeKeypairFromHash', () => {
  test('should create keypair with exact publicKey/privateKey values from hash', () => {
    const keypair = keys.makeKeypairFromHash(mocked.hash);

    expect(keypair.publicKey).toStrictEqual(mocked.publicKey);
    expect(keypair.privateKey).toStrictEqual(mocked.privateKey);
  });
});

describe('createHashFromPassphrase', () => {
  test('should create exact hash from the pass phrase', () => {
    const passphrase =
      'wrap track hamster grocery casual talk theory half artist toast art essence';

    const hash = keys.createHashFromPassphrase(passphrase);

    expect(hash).toStrictEqual(mocked.hash);
  });
});

describe('createKeypairFromPassphrase', () => {
  test('should create keypair with exact publicKey/privateKey values from pass phrase', () => {
    const keypair = keys.createKeypairFromPassphrase(mocked.passphrase);

    expect(keypair.publicKey).toStrictEqual(mocked.publicKey);
    expect(keypair.privateKey).toStrictEqual(mocked.privateKey);
  });
});

describe('createAddressFromPublicKey', () => {
  test('should return a string which matches the address pattern', () => {
    const address = keys.createAddressFromPublicKey(mocked.publicKey);

    expect(address).toBe(mocked.address);
  });
});
