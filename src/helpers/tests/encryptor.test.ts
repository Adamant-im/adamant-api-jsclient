import {
  bytesToHex,
  decodeMessage,
  encodeMessage,
  hexToBytes,
  utf8ArrayToStr,
} from '../encryptor';
import {createKeypairFromPassphrase} from '../keys';

const alice =
  'apple banana cherry date elderberry fig grape hazelnut iris juniper kiwi lemon';
const bob =
  'mirror noble ocean piano quantum river silver tiger unity velvet willow xenon';

describe('message encryption', () => {
  test('round-trips Unicode messages with keypairs and hexadecimal public keys', () => {
    const aliceKeys = createKeypairFromPassphrase(alice);
    const bobKeys = createKeypairFromPassphrase(bob);
    const encrypted = encodeMessage(
      'Hello, Привет, 世界',
      aliceKeys,
      bytesToHex(bobKeys.publicKey),
    );

    expect(
      decodeMessage(
        encrypted.message,
        aliceKeys.publicKey,
        bobKeys,
        encrypted.own_message,
      ),
    ).toBe('Hello, Привет, 世界');
  });

  test('accepts a passphrase while decrypting and rejects authentication failures', () => {
    const aliceKeys = createKeypairFromPassphrase(alice);
    const bobKeys = createKeypairFromPassphrase(bob);
    const encrypted = encodeMessage('secret', aliceKeys, bobKeys.publicKey);

    expect(
      decodeMessage(
        encrypted.message,
        aliceKeys.publicKey,
        bob,
        encrypted.own_message,
      ),
    ).toBe('secret');
    expect(
      decodeMessage(
        encrypted.message.replace(/^../, '00'),
        aliceKeys.publicKey,
        bob,
        encrypted.own_message,
      ),
    ).toBe('');
  });

  test('converts byte, hex and UTF-8 representations', () => {
    const bytes = Uint8Array.from([0, 15, 16, 255]);
    expect(bytesToHex(bytes)).toBe('000f10ff');
    expect(hexToBytes('000f10ff')).toEqual(bytes);
    expect(utf8ArrayToStr(Uint8Array.from(Buffer.from('Aé€')))).toBe('Aé€');
  });

  test('validates encryption and decryption inputs', () => {
    const keys = createKeypairFromPassphrase(alice);
    const invalidKey = new Uint8Array(31).fill(1);

    expect(() => encodeMessage('x', keys, invalidKey)).toThrow(
      'encodeMessage: invalid key',
    );
    expect(() =>
      decodeMessage(1 as unknown as string, keys.publicKey, keys, '00'),
    ).toThrow('message should be a string');
    expect(() =>
      decodeMessage('00', keys.publicKey, keys, 1 as unknown as string),
    ).toThrow('nonce should be a string');
    expect(() => decodeMessage('00', {} as Uint8Array, keys, '00')).toThrow(
      'senderPublicKey should be a string or an instance of Uint8Array',
    );
    expect(() => decodeMessage('00', invalidKey, keys, '00')).toThrow(
      'decodeMessage: invalid key',
    );
  });
});
