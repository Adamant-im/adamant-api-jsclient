import * as keys from '../keys';

const mocked = {
  address: 'U6687642817984673870',
  passPhrase: 'wrap track hamster grocery casual talk theory half artist toast art essence',
  publicKey: Buffer.from(
    '7db9b51bc75fed7b8e631e2efaad38305b12c6b3d3d9f6af3498fdcb7b35c284',
    'hex'
  ),
  privateKey: Buffer.from(
    '24a26e6cd6283528f6e2637dcf834434176cf8696647bd4aa6223f349882dc967db9b51bc75fed7b8e631e2efaad38305b12c6b3d3d9f6af3498fdcb7b35c284',
    'hex'
  ),
  hash: Buffer.from(
    '24a26e6cd6283528f6e2637dcf834434176cf8696647bd4aa6223f349882dc96',
    'hex'
  )
}

describe('createNewPassPhrase', () => {
  test('should return string that contains more than 11 words', () => {
    const passPhrase = keys.createNewPassPhrase();

    expect(typeof passPhrase).toBe('string');
    expect(
        passPhrase.split(' ').length,
    ).toBeGreaterThanOrEqual(12);
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
    const passPhrase = 'wrap track hamster grocery casual talk theory half artist toast art essence';

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
    console.log(mocked.publicKey)
    const address = keys.createAddressFromPublicKey(mocked.publicKey);

    expect(address).toBe(mocked.address);
  });
});
