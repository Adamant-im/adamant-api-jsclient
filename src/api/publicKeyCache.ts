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
 * hit verifies the cryptographic address binding, which is network-independent.
 *
 * @internal
 */
export const publicKeysCache = new Map<string, string>();

/**
 * Per-client delegate caches storing network-dependent delegate membership
 * (`byAddress`) and username -> public key mappings (`byUsername`).
 *
 * @internal
 */
export interface DelegateCaches {
  byAddress: Map<string, string>;
  byUsername: Map<string, string>;
}

/**
 * Creates isolated delegate caches for a single `AdamantApi` client instance
 * so delegate membership and username mappings do not leak across networks
 * (for example, mainnet and testnet clients in the same process).
 *
 * @internal
 */
export const createDelegateCaches = (): DelegateCaches => ({
  byAddress: new Map<string, string>(),
  byUsername: new Map<string, string>(),
});

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
 * Reads a cached delegate public key for `address` from a client-scoped cache
 * only if it still passes full Ed25519 and address-binding verification.
 * Invalid entries are evicted immediately.
 *
 * @internal
 */
export const getVerifiedCachedDelegateAddressPublicKey = (
  cache: Map<string, string>,
  address: string,
  onInvalid?: (reason: PublicKeyVerificationFailureReason) => void,
): string | undefined => readVerifiedAddressCache(cache, address, onInvalid);

/**
 * Verifies that a confirmed delegate's `publicKey` is bound to `address` and
 * stores it in both the client-scoped delegate-address cache and the shared
 * address cache.
 *
 * @internal
 */
export const cacheVerifiedDelegateAddressPublicKey = (
  cache: Map<string, string>,
  address: string,
  publicKey: unknown,
): PublicKeyVerificationResult => {
  const verification = verifyPublicKeyForAddress(address, publicKey);
  if (verification.valid) {
    cache.set(address, verification.publicKey);
    publicKeysCache.set(address, verification.publicKey);
  }

  return verification;
};

/**
 * Reads a cached delegate public key by `username` from a client-scoped cache
 * only if it is a valid 32-byte Ed25519 public key. Invalid entries are evicted
 * immediately.
 *
 * @internal
 */
export const getVerifiedCachedDelegatePublicKey = (
  cache: Map<string, string>,
  username: string,
  onInvalid?: () => void,
): string | undefined => {
  const cached = cache.get(username);
  if (cached === undefined) {
    return undefined;
  }

  if (!isValidEd25519PublicKey(cached)) {
    cache.delete(username);
    onInvalid?.();
    return undefined;
  }

  return cached;
};

/**
 * Validates a delegate-by-username response before caching `publicKey` under
 * `username` in a client-scoped cache.
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
  cache: Map<string, string>,
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

  cache.set(username, verification.publicKey);
  return verification;
};

/**
 * Clears the shared address public-key cache. Intended for test isolation.
 *
 * @internal
 */
export const clearPublicKeysCache = () => {
  publicKeysCache.clear();
};
