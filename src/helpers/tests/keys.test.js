const keys = require("../keys");
const { validateAdmAddress } = require("../validator");

describe("createNewPassPhrase", () => {
  test("should return string that contains more than 11 words", () => {
    const passphrase = keys.createNewPassPhrase();

    expect(typeof passphrase).toBe("string");
    expect(passphrase.split(" ").length).toBeGreaterThanOrEqual(12);
  });
});

describe("makeKeypairFromHash", () => {
  test("should return object with buffers publicKey and privateKey", () => {
    const passPhrase = keys.createNewPassPhrase();
    const hash = keys.createHashFromPassPhrase(passPhrase);

    const keypair = keys.makeKeypairFromHash(hash);

    expect(typeof keypair).toBe("object");

    expect(Buffer.isBuffer(keypair.publicKey)).toBe(true);
    expect(Buffer.isBuffer(keypair.privateKey)).toBe(true);
  });
});

describe("createHashFromPassPhrase", () => {
  test("should return different hashes for different pass phrases", () => {
    const passPhrase = keys.createNewPassPhrase();
    const passPhrase2 = keys.createNewPassPhrase();

    const hash = keys.createHashFromPassPhrase(passPhrase);
    const hash2 = keys.createHashFromPassPhrase(passPhrase2);

    expect(hash.equals(hash2)).toBe(false);
  });
});

describe("createKeypairFromPassPhrase", () => {
  test("should return keypair with publicKey and privateKey", () => {
    const passPhrase = keys.createNewPassPhrase();
    const keypair = keys.createKeypairFromPassPhrase(passPhrase);

    expect(typeof keypair).toBe("object");

    expect(Buffer.isBuffer(keypair.publicKey)).toBe(true);
    expect(Buffer.isBuffer(keypair.privateKey)).toBe(true);
  });
});

describe("createAddressFromPublicKey", () => {
  test("should return a string which matches the address pattern", () => {
    const passPhrase = keys.createNewPassPhrase();
    const keypair = keys.createKeypairFromPassPhrase(passPhrase);

    const address = keys.createAddressFromPublicKey(keypair.publicKey);

    expect(validateAdmAddress(address)).toBe(true);
  });
});
