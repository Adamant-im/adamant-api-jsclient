import BigNumber from 'bignumber.js';
import {
  bignumberToHex,
  bufferToHexArray,
  fromBuffer,
  hexToBuffer,
  resolveEndian,
  resolveSize,
  toBuffer,
  validateBufferLength,
} from '../bignumber';

describe('BigNumber buffer helpers', () => {
  test('converts big- and little-endian buffers', () => {
    expect(fromBuffer(Buffer.from('0102', 'hex')).toString(16)).toBe('102');
    expect(
      fromBuffer(Buffer.from('0102', 'hex'), {
        endian: 'little',
        size: 2,
      }).toString(16),
    ).toBe('201');
    expect(toBuffer(new BigNumber('102', 16))).toEqual(
      Buffer.from('0102', 'hex'),
    );
    expect(hexToBuffer('0102', 2, 'little')).toEqual(
      Buffer.from('0201', 'hex'),
    );
    expect(bufferToHexArray(Buffer.from('0102', 'hex'), 2, 'little')).toEqual([
      '0201',
    ]);
  });

  test('resolves defaults, aliases and automatic sizes', () => {
    expect(resolveEndian({})).toBe('big');
    expect(resolveEndian({endian: -1})).toBe('little');
    expect(resolveSize({size: 'auto'}, 1.2)).toBe(2);
    expect(resolveSize({}, 10)).toBe(1);
  });

  test('validates lengths and negative regular-buffer conversion', () => {
    expect(() => validateBufferLength(Buffer.alloc(3), 2)).toThrow(RangeError);
    expect(() => bignumberToHex(new BigNumber(-1))).toThrow('negative numbers');
  });

  test('encodes zero, positive and negative SSH mpints', () => {
    expect(toBuffer(new BigNumber(0), 'mpint')).toEqual(Buffer.alloc(4));
    expect(toBuffer(new BigNumber(128), 'mpint').toString('hex')).toBe(
      '000000020080',
    );
    expect(toBuffer(new BigNumber(-1), 'mpint').toString('hex')).toBe(
      '00000001ff',
    );
  });
});
