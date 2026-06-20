import sodium from 'sodium-browserify-tweetnacl';
import crypto from 'crypto';
import {mnemonicToSeedSync, generateMnemonic} from 'bip39';

import * as bignum from './bignumber';
import type {AdamantAddress} from '../api';

export interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

/** Creates a new BIP39 mnemonic suitable for an ADM account passphrase. */
export const createNewPassphrase = () => generateMnemonic();

/** Derives the established ADM Ed25519 keypair from a 32-byte seed hash. */
export const makeKeypairFromHash = (hash: Buffer): KeyPair => {
  const keypair = sodium.crypto_sign_seed_keypair(hash);

  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey,
  };
};

/** Applies the protocol-compatible ADM passphrase hashing procedure. */
export const createHashFromPassphrase = (passphrase: string) =>
  crypto
    .createHash('sha256')
    .update(mnemonicToSeedSync(passphrase).toString('hex'), 'hex')
    .digest();

/** Derives the established ADM keypair from a BIP39 passphrase. */
export const createKeypairFromPassphrase = (passphrase: string) => {
  const hash = createHashFromPassphrase(passphrase);

  return makeKeypairFromHash(hash);
};

/** Converts an ADM public key into its `U`-prefixed account address. */
export const createAddressFromPublicKey = (
  publicKey: Buffer | string,
): AdamantAddress => {
  const hash = crypto.createHash('sha256');

  if (typeof publicKey === 'string') {
    hash.update(publicKey, 'hex');
  } else {
    hash.update(publicKey);
  }

  const publicKeyBuffer = hash.digest();

  const temp = Buffer.alloc(8);

  for (let i = 0; i < 8; i++) {
    temp[i] = publicKeyBuffer[7 - i];
  }

  return `U${bignum.fromBuffer(temp)}`;
};
