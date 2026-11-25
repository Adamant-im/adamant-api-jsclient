import {
  isValidEd25519PublicKey,
  verifyPublicKeyForAddress,
  type PublicKeyVerificationFailureReason,
  type PublicKeyVerificationResult,
} from '../helpers/publicKey';

/**
 * Shared process-wide cache of verified ADM address -> Ed25519 public key
 * mappings. Every write and cache hit verifies the address binding.
 *
 * @internal
 */
export const publicKeysCache = new Map<string, string>();

/**
 * Shared cache of delegate username -> verified Ed25519 public key mappings,
 * kept separate from address-keyed entries.
 *
 * @internal
 */
export const delegatePublicKeysCache = new Map<string, string>();

/**
 * Reads a cached public key for `address` only if it still passes full Ed25519
 * and address-binding verification. Invalid entries are evicted immediately.
 *
 * @internal
 */
export const getVerifiedCachedPublicKey = (
  address: string,
  onInvalid?: (reason: PublicKeyVerificationFailureReason) => void,
): string | undefined => {
  const cached = publicKeysCache.get(address);
  if (cached === undefined) {
    return undefined;
  }

  const verification = verifyPublicKeyForAddress(address, cached);
  if (!verification.valid) {
    publicKeysCache.delete(address);
    onInvalid?.(verification.reason);
    return undefined;
  }

  return verification.publicKey;
};

/**
 * Verifies that `publicKey` is a well-formed 32-byte Ed25519 key bound to
 * `address` and stores it in the shared address cache on success.
 *
 * @internal
 */
export const cacheVerifiedPublicKey = (
  address: string,
  publicKey: unknown,
): PublicKeyVerificationResult => {
  const verification = verifyPublicKeyForAddress(address, publicKey);
  if (verification.valid) {
    publicKeysCache.set(address, verification.publicKey);
  }

  return verification;
};

/**
 * Reads a cached delegate public key by `username` only if it is a valid
 * 32-byte Ed25519 public key. Invalid entries are evicted immediately.
 *
 * @internal
 */
export const getVerifiedCachedDelegatePublicKey = (
  username: string,
  onInvalid?: () => void,
): string | undefined => {
  const cached = delegatePublicKeysCache.get(username);
  if (cached === undefined) {
    return undefined;
  }

  if (!isValidEd25519PublicKey(cached)) {
    delegatePublicKeysCache.delete(username);
    onInvalid?.();
    return undefined;
  }

  return cached;
};

/**
 * Validates a delegate public key (and its binding to `address` when provided)
 * before storing it in the delegate username cache.
 *
 * @internal
 */
export const cacheVerifiedDelegatePublicKey = (
  username: string,
  publicKey: unknown,
  address?: unknown,
): PublicKeyVerificationResult => {
  if (address !== undefined) {
    const verification = verifyPublicKeyForAddress(address, publicKey);
    if (!verification.valid) {
      return verification;
    }

    delegatePublicKeysCache.set(username, verification.publicKey);
    return verification;
  }

  if (!isValidEd25519PublicKey(publicKey)) {
    return {valid: false, reason: 'malformed'};
  }

  delegatePublicKeysCache.set(username, publicKey);
  return {valid: true, publicKey};
};

/**
 * Clears all cached public keys. Intended for test isolation.
 *
 * @internal
 */
export const clearPublicKeysCache = () => {
  publicKeysCache.clear();
  delegatePublicKeysCache.clear();
};
