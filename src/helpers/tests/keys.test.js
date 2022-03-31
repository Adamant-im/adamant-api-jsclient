const keys = require('../keys');
const {validateAdmAddress} = require('../validator');

describe('createNewPassPhrase', () => {
  test('Should return string that contains more than 11 words', () => {
    const passPhrase = keys.createNewPassPhrase();

    expect(typeof passPhrase).toBe('string');
    expect(
        passPhrase.split(' ').length,
    ).toBeGreaterThanOrEqual(12);
  });
});

describe('makeKeypairFromHash', () => {
  test('Should return object with buffers publicKey and privateKey', () => {
    const passPhrase = keys.createNewPassPhrase();
    const hash = keys.createHashFromPassPhrase(passPhrase);

    const keypair = keys.makeKeypairFromHash(hash);

    expect(typeof keypair).toBe('object');

    expect(Buffer.isBuffer(keypair.publicKey)).toBe(true);
    expect(Buffer.isBuffer(keypair.privateKey)).toBe(true);
  });
});

describe('createHashFromPassPhrase', () => {
  test('Should return different hashes for different passPhrases', () => {
    const passPhrase = keys.createNewPassPhrase();
    const passPhrase2 = keys.createNewPassPhrase();

    const hash = keys.createHashFromPassPhrase(passPhrase);
    const hash2 = keys.createHashFromPassPhrase(passPhrase2);

    expect(hash.equals(hash2)).toBe(false);
  });
});

describe('createKeypairFromPassPhrase', () => {
  test('Should return keypair with publicKey and privateKey', () => {
    const passPhrase = keys.createNewPassPhrase();
    const keypair = keys.createKeypairFromPassPhrase(passPhrase);

    expect(typeof keypair).toBe('object');

    expect(Buffer.isBuffer(keypair.publicKey)).toBe(true);
    expect(Buffer.isBuffer(keypair.privateKey)).toBe(true);
  });
});

describe('createAddressFromPublicKey', () => {
  test('Should return a string which matches the address pattern', () => {
    const passPhrase = keys.createNewPassPhrase();
    const keypair = keys.createKeypairFromPassPhrase(passPhrase);

    const address = keys.createAddressFromPublicKey(keypair.publicKey);

    expect(validateAdmAddress(address)).toBe(true);
  });
});
