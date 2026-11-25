import {
  isValidEd25519PublicKey,
  verifyPublicKeyForAddress,
  type PublicKeyVerificationFailureReason,
  type PublicKeyVerificationResult,
} from '../helpers/publicKey';
import {isAdmAddress} from '../helpers/validator';

/**
 * Shared process-wide cache of verified ADM address -> Ed25519 public key
 * mappings used by `getPublicKey()` and `sendMessage()`. Every write and cache
 * hit verifies the address binding.
 *
 * @internal
 */
export const publicKeysCache = new Map<string, string>();

/**
 * Cache of verified delegate ADM address -> Ed25519 public key mappings. Kept
 * separate from `publicKeysCache` so messaging a non-delegate account cannot
 * cause `voteForDelegate()` to skip delegate-membership validation.
 *
 * @internal
 */
export const delegateAddressPublicKeysCache = new Map<string, string>();

/**
 * Cache of delegate username -> Ed25519 public key mappings, kept separate
 * from address-keyed caches.
 *
 * @internal
 */
export const delegatePublicKeysCache = new Map<string, string>();

const readVerifiedAddressCache = (
  cache: Map<string, string>,
  address: string,
  onInvalid?: (reason: PublicKeyVerificationFailureReason) => void,
): string | undefined => {
  const cached = cache.get(address);
  if (cached === undefined) {
    return undefined;
  }

  const verification = verifyPublicKeyForAddress(address, cached);
  if (!verification.valid) {
    cache.delete(address);
    onInvalid?.(verification.reason);
    return undefined;
  }

  return verification.publicKey;
};

/**
 * Reads a cached public key for `address` only if it still passes full Ed25519
 * and address-binding verification. Invalid entries are evicted immediately.
 *
 * @internal
 */
export const getVerifiedCachedPublicKey = (
  address: string,
  onInvalid?: (reason: PublicKeyVerificationFailureReason) => void,
): string | undefined =>
  readVerifiedAddressCache(publicKeysCache, address, onInvalid);

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
 * Reads a cached delegate public key for `address` only if it still passes
 * full Ed25519 and address-binding verification. Invalid entries are evicted
 * immediately.
 *
 * @internal
 */
export const getVerifiedCachedDelegateAddressPublicKey = (
  address: string,
  onInvalid?: (reason: PublicKeyVerificationFailureReason) => void,
): string | undefined =>
  readVerifiedAddressCache(delegateAddressPublicKeysCache, address, onInvalid);

/**
 * Verifies that a confirmed delegate's `publicKey` is bound to `address` and
 * stores it in both the delegate-address cache and the shared address cache.
 *
 * @internal
 */
export const cacheVerifiedDelegateAddressPublicKey = (
  address: string,
  publicKey: unknown,
): PublicKeyVerificationResult => {
  const verification = verifyPublicKeyForAddress(address, publicKey);
  if (verification.valid) {
    delegateAddressPublicKeysCache.set(address, verification.publicKey);
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
 * Validates a delegate-by-username response before caching `publicKey` under
 * `username`.
 *
 * `DelegateDto.address` is required by the ADAMANT OpenAPI schema, so a
 * missing or invalid `address` is rejected as `malformed`. Note that for
 * username lookups this binding only proves the node's response is
 * self-consistent (`publicKey` derives `address`); it does not prove that
 * `username` belongs to that delegate.
 *
 * @internal
 */
export const cacheVerifiedDelegatePublicKey = (
  username: string,
  publicKey: unknown,
  address: unknown,
): PublicKeyVerificationResult => {
  if (!isAdmAddress(address)) {
    return {valid: false, reason: 'malformed'};
  }

  const verification = verifyPublicKeyForAddress(address, publicKey);
  if (!verification.valid) {
    return verification;
  }

  delegatePublicKeysCache.set(username, verification.publicKey);
  return verification;
};

/**
 * Clears all cached public keys. Intended for test isolation.
 *
 * @internal
 */
export const clearPublicKeysCache = () => {
  publicKeysCache.clear();
  delegateAddressPublicKeysCache.clear();
  delegatePublicKeysCache.clear();
};
