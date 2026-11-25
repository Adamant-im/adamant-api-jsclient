import ed2curve from 'ed2curve';

import {createAddressFromPublicKey} from './keys';
import {isAdmAddress, isAdmPublicKey} from './validator';

export type PublicKeyVerificationFailureReason =
  'invalid_address' | 'malformed' | 'mismatch';

export type PublicKeyVerificationResult =
  | {valid: true; publicKey: string}
  | {valid: false; reason: PublicKeyVerificationFailureReason};

const ED25519_PUBLIC_KEY_BYTE_LENGTH = 32;

/**
 * Low-order Curve25519 u-coordinates (with bit 255 cleared) corresponding to
 * Ed25519 small-order points (orders 1, 2, 4, and 8) plus the non-canonical
 * `+p` encodings `p` and `p + 1` in `[0, 2^255 - 1]`. Any X25519 scalar
 * multiplication with one of these points yields an all-zero shared secret.
 */
const LOW_ORDER_CURVE25519_U_COORDINATES = new Set([
  // 0 (identity / order 2)
  '0000000000000000000000000000000000000000000000000000000000000000',
  // 1 (order 4)
  '0100000000000000000000000000000000000000000000000000000000000000',
  // 325606250916557431795983626356110631294008115727848805560023387167927233504 (order 8)
  'e0eb7a7c3b41b8ae1656e3faf19fc46ada098deb9c32b1fd866205165f49b800',
  // 39382357235489614581723060781553021112529911719440698176882885853963445705823 (order 8)
  '5f9c95bca3508c24b1d0b1559c83ef5b04445cc4581c8e86d8224eddd09f1157',
  // p - 1 (order 2 on the twist / low-order u)
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  // p (non-canonical 0 mod p)
  'edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  // p + 1 (non-canonical 1 mod p)
  'eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
]);

const isCanonicalEd25519Coordinate = (bytes: Uint8Array): boolean => {
  if ((bytes[31] & 0x7f) !== 0x7f) {
    return true;
  }

  for (let i = 30; i >= 1; i--) {
    if (bytes[i] !== 0xff) {
      return true;
    }
  }

  return bytes[0] < 0xed;
};

const isLowOrderCurve25519Point = (dhPublicKey: Uint8Array): boolean => {
  const normalized = Buffer.from(dhPublicKey);
  normalized[31] &= 0x7f;
  return LOW_ORDER_CURVE25519_U_COORDINATES.has(normalized.toString('hex'));
};

const toPublicKeyBytes = (publicKey: unknown): Uint8Array | null => {
  if (typeof publicKey === 'string') {
    if (!isAdmPublicKey(publicKey)) {
      return null;
    }

    return Buffer.from(publicKey, 'hex');
  }

  if (publicKey instanceof Uint8Array) {
    return publicKey.length === ED25519_PUBLIC_KEY_BYTE_LENGTH
      ? publicKey
      : null;
  }

  return null;
};

/**
 * Validates that `publicKey` is a canonical 32-byte Ed25519 public key and
 * converts it to a Curve25519 public key suitable for NaCl box.
 *
 * Returns `null` when the input has the wrong length/encoding, encodes a
 * non-canonical coordinate (`y >= 2^255 - 19`), does not lie on the Ed25519
 * curve, or maps to a low-order Curve25519 point (orders 1, 2, 4, or 8) that
 * produces an all-zero X25519 shared secret.
 *
 * @internal
 */
export const convertVerifiedEd25519PublicKey = (
  publicKey: unknown,
): Uint8Array | null => {
  const bytes = toPublicKeyBytes(publicKey);
  if (!bytes || !isCanonicalEd25519Coordinate(bytes)) {
    return null;
  }

  const dhPublicKey = ed2curve.convertPublicKey(bytes);
  if (!dhPublicKey || isLowOrderCurve25519Point(dhPublicKey)) {
    return null;
  }

  return dhPublicKey;
};

/**
 * Reports whether `publicKey` is a well-formed 64-character hexadecimal
 * encoding of a valid 32-byte Ed25519 public key.
 *
 * @internal
 */
export const isValidEd25519PublicKey = (
  publicKey: unknown,
): publicKey is string =>
  typeof publicKey === 'string' &&
  convertVerifiedEd25519PublicKey(publicKey) !== null;

/**
 * Verifies that `publicKey` is a well-formed 32-byte Ed25519 public key and
 * locally derives `address`.
 *
 * @internal
 */
export const verifyPublicKeyForAddress = (
  address: unknown,
  publicKey: unknown,
): PublicKeyVerificationResult => {
  if (!isAdmAddress(address)) {
    return {valid: false, reason: 'invalid_address'};
  }

  if (!isValidEd25519PublicKey(publicKey)) {
    return {valid: false, reason: 'malformed'};
  }

  try {
    if (createAddressFromPublicKey(publicKey) !== address) {
      return {valid: false, reason: 'mismatch'};
    }
  } catch {
    return {valid: false, reason: 'malformed'};
  }

  return {valid: true, publicKey};
};

/**
 * Formats a human-readable explanation for a public-key verification failure.
 *
 * @internal
 */
export const formatPublicKeyVerificationReason = (
  reason: PublicKeyVerificationFailureReason,
): string => {
  switch (reason) {
    case 'invalid_address':
      return 'target ADM address is invalid';
    case 'malformed':
      return 'public key is malformed or not a valid 32-byte Ed25519 public key';
    case 'mismatch':
      return 'public key does not derive the target ADM address';
  }
};
