/**
 * Explicit ADM-only SDK surface: the HTTP API client, transaction builders,
 * message encryption, key derivation, validators, and the WebSocket client.
 * Coin implementations are exposed through explicit `adamant-api/coins/*` entry
 * points so importing ADM features stays lightweight.
 *
 * @module
 */

export * from '../api/index';
export * from '../helpers/transactions/index';
export * from '../helpers/encryptor';
export * from '../helpers/constants';
export * from '../helpers/logger';
export * from '../helpers/wsClient';
export * from '../helpers/keys';
export {getEpochTime, getEpochTimeMs} from '../helpers/time';
export {
  isPassphrase,
  isAdmAddress,
  isAdmPublicKey,
  isAdmVoteForPublicKey,
  isAdmVoteForAddress,
  isAdmVoteForDelegateName,
  validateMessage,
  isDelegateName,
  admToSats,
} from '../helpers/validator';
