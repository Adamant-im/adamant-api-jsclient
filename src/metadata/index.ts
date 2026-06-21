/**
 * Bundled, pinned ADM and external-coin wallet metadata, generated from a
 * fixed `adamant-wallets` revision so updates stay deterministic and reviewable.
 *
 * @module
 */

import wallets from './wallets.json';

/** Pinned upstream revision used to generate the bundled wallet metadata. */
export const walletMetadataSource = wallets.source;

/** Authoritative metadata for SDK-supported ADM and external coin modules. */
export const coinMetadata = wallets.coins;

export type CoinSymbol = keyof typeof coinMetadata;
export type CoinMetadata = (typeof coinMetadata)[CoinSymbol];
