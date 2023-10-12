import * as keys from '../keys';
import {mocked} from './mock-data/address';

describe('createNewPassPhrase', () => {
  test('should return string that contains more than 11 words', () => {
    const passPhrase = keys.createNewPassPhrase();

    expect(typeof passPhrase).toBe('string');
    expect(passPhrase.split(' ').length).toBeGreaterThanOrEqual(12);
  });
});

describe('makeKeypairFromHash', () => {
  test('should create keypair with exact publicKey/privateKey values from hash', () => {
    const keypair = keys.makeKeypairFromHash(mocked.hash);

    expect(keypair.publicKey).toStrictEqual(mocked.publicKey);
    expect(keypair.privateKey).toStrictEqual(mocked.privateKey);
  });
});

describe('createHashFromPassPhrase', () => {
  test('should create exact hash from the pass phrase', () => {
    const passPhrase =
      'wrap track hamster grocery casual talk theory half artist toast art essence';

    const hash = keys.createHashFromPassPhrase(passPhrase);

    expect(hash).toStrictEqual(mocked.hash);
  });
});

describe('createKeypairFromPassPhrase', () => {
  test('should create keypair with exact publicKey/privateKey values from pass phrase', () => {
    const keypair = keys.createKeypairFromPassPhrase(mocked.passPhrase);

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
