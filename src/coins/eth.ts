/**
 * Ethereum wallet helper: deterministic key and address derivation from an
 * ADAMANT passphrase.
 *
 * @module
 */

import {mnemonicToSeedSync} from 'bip39';
import BIP32Factory from 'bip32';
import {keccak256} from 'ethereum-cryptography/keccak.js';
import {secp256k1} from 'ethereum-cryptography/secp256k1.js';
import * as tinysecp from 'tiny-secp256k1';

import {coinMetadata} from '../metadata/index';

const HD_KEY_PATH = "m/44'/60'/3'/1/0";
const RE_ETH_ADDRESS = new RegExp(coinMetadata.ETH.regexAddress);
const bip32 = BIP32Factory(tinysecp);

/** Deterministic Ethereum wallet derivation and address validation helpers. */
export const eth = {
  metadata: coinMetadata.ETH,
  keys: (passphrase: string) => {
    const seed = mnemonicToSeedSync(passphrase);
    const privateKey = bip32.fromSeed(seed).derivePath(HD_KEY_PATH).privateKey;

    if (!privateKey) {
      throw new Error('Unable to derive Ethereum private key');
    }

    const publicKey = secp256k1.getPublicKey(privateKey, false);
    const address = keccak256(publicKey.slice(1)).slice(-20);

    return {
      address: `0x${Buffer.from(address).toString('hex')}`,
      privateKey: `0x${Buffer.from(privateKey).toString('hex')}`,
    };
  },
  isValidAddress: (address: string) =>
    typeof address === 'string' && RE_ETH_ADDRESS.test(address),
};
