import ed2curve from 'ed2curve';

import {createAddressFromPublicKey} from './keys';
import {isAdmAddress, isAdmPublicKey} from './validator';

export type PublicKeyVerificationFailureReason =
  'invalid_address' | 'malformed' | 'mismatch';

export type PublicKeyVerificationResult =
  | {valid: true; publicKey: string}
  | {valid: false; reason: PublicKeyVerificationFailureReason};

const ED25519_PUBLIC_KEY_BYTE_LENGTH = 32;

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
 * converts it to a non-zero Curve25519 public key suitable for NaCl box.
 *
 * Returns `null` when the input has the wrong length/encoding, encodes a
 * non-canonical coordinate (`y >= 2^255 - 19`), does not lie on the Ed25519
 * curve, or maps to the degenerate all-zero Curve25519 point.
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
  if (!dhPublicKey || dhPublicKey.every(byte => byte === 0)) {
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
