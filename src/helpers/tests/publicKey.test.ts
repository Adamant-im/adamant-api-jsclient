import {bytesToHex} from '../encryptor';
import {createAddressFromPublicKey, createKeypairFromPassphrase} from '../keys';
import {
  convertVerifiedEd25519PublicKey,
  formatPublicKeyVerificationReason,
  isValidEd25519PublicKey,
  verifyPublicKeyForAddress,
} from '../publicKey';

const aliceKeyPair = createKeypairFromPassphrase(
  'apple banana cherry date elderberry fig grape hazelnut iris juniper kiwi lemon',
);
const bobKeyPair = createKeypairFromPassphrase(
  'mirror noble ocean piano quantum river silver tiger unity velvet willow xenon',
);

const alicePublicKey = bytesToHex(aliceKeyPair.publicKey);
const aliceAddress = createAddressFromPublicKey(alicePublicKey);
const bobPublicKey = bytesToHex(bobKeyPair.publicKey);

// 32-byte values that are syntactically valid 64-char hex but invalid Ed25519 keys.
const offCurvePublicKeyHex = `02${'00'.repeat(31)}`;
const nonCanonicalFieldHex = `ed${'ff'.repeat(30)}7f`;
const allOnesHex = 'ff'.repeat(32);
const identityPointHex = `01${'00'.repeat(31)}`;
const orderTwoPointHex = `ec${'ff'.repeat(30)}7f`;

describe('Ed25519 public-key verification helpers', () => {
  test('accepts valid 32-byte Ed25519 keys in hex (lower/upper) and Uint8Array forms', () => {
    expect(isValidEd25519PublicKey(alicePublicKey)).toBe(true);
    expect(isValidEd25519PublicKey(alicePublicKey.toUpperCase())).toBe(true);
    expect(
      convertVerifiedEd25519PublicKey(aliceKeyPair.publicKey),
    ).toBeInstanceOf(Uint8Array);
    expect(
      convertVerifiedEd25519PublicKey(aliceKeyPair.publicKey)?.length,
    ).toBe(32);
  });

  test.each([
    ['empty string', ''],
    ['short hex (31 bytes)', '00'.repeat(31)],
    ['long hex (33 bytes)', '00'.repeat(33)],
    ['non-hex 64 chars', 'z'.repeat(64)],
    ['off-curve 32-byte point', offCurvePublicKeyHex],
    ['non-canonical y = p', nonCanonicalFieldHex],
    ['non-canonical all 0xff', allOnesHex],
    ['identity point (y = 1)', identityPointHex],
    ['order-2 point (y = -1)', orderTwoPointHex],
    ['null', null],
    ['undefined', undefined],
    ['number', 12345],
    ['object', {}],
  ])('rejects malformed key (%s)', (_label, candidate) => {
    expect(isValidEd25519PublicKey(candidate)).toBe(false);
    expect(convertVerifiedEd25519PublicKey(candidate)).toBeNull();
  });

  test('rejects Uint8Array keys with invalid byte length or invalid curve encoding', () => {
    expect(convertVerifiedEd25519PublicKey(new Uint8Array(0))).toBeNull();
    expect(convertVerifiedEd25519PublicKey(new Uint8Array(31))).toBeNull();
    expect(convertVerifiedEd25519PublicKey(new Uint8Array(33))).toBeNull();
    expect(
      convertVerifiedEd25519PublicKey(Buffer.from(offCurvePublicKeyHex, 'hex')),
    ).toBeNull();
    expect(
      convertVerifiedEd25519PublicKey(Buffer.from(nonCanonicalFieldHex, 'hex')),
    ).toBeNull();
    expect(
      convertVerifiedEd25519PublicKey(Buffer.from(identityPointHex, 'hex')),
    ).toBeNull();
  });

  test('verifies address binding for matching, mismatched, and malformed keys', () => {
    expect(verifyPublicKeyForAddress(aliceAddress, alicePublicKey)).toEqual({
      valid: true,
      publicKey: alicePublicKey,
    });
    expect(
      verifyPublicKeyForAddress(aliceAddress, alicePublicKey.toUpperCase()),
    ).toEqual({
      valid: true,
      publicKey: alicePublicKey.toUpperCase(),
    });

    expect(verifyPublicKeyForAddress(aliceAddress, bobPublicKey)).toEqual({
      valid: false,
      reason: 'mismatch',
    });
    expect(
      verifyPublicKeyForAddress(aliceAddress, offCurvePublicKeyHex),
    ).toEqual({
      valid: false,
      reason: 'malformed',
    });
    expect(verifyPublicKeyForAddress(aliceAddress, 'not-a-key')).toEqual({
      valid: false,
      reason: 'malformed',
    });
    expect(verifyPublicKeyForAddress('invalid', alicePublicKey)).toEqual({
      valid: false,
      reason: 'invalid_address',
    });
  });

  test('formats clear verification failure reasons', () => {
    expect(formatPublicKeyVerificationReason('invalid_address')).toContain(
      'invalid',
    );
    expect(formatPublicKeyVerificationReason('malformed')).toContain('Ed25519');
    expect(formatPublicKeyVerificationReason('mismatch')).toContain('derive');
  });
});
