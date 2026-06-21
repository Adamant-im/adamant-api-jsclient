/**
 * Dogecoin wallet helper: deterministic P2PKH key and address derivation from
 * an ADAMANT passphrase, plus address validation.
 *
 * @module
 */

import * as bitcoin from 'bitcoinjs-lib';
import {ECPairFactory} from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

import coininfo from 'coininfo';
import {coinMetadata} from '../metadata/index';
import {toECPairNetwork, type UtxoWalletKeys} from './ecpairNetwork';

const RE_DOGE_ADDRESS = new RegExp(coinMetadata.DOGE.regexAddress);

const network = coininfo.dogecoin.main.toBitcoinJS();
const ecpairNetwork = toECPairNetwork(network, 'doge');

/** Deterministic Dogecoin wallet derivation and address validation helpers. */
export const doge = {
  metadata: coinMetadata.DOGE,
  keys: (passphrase: string): UtxoWalletKeys => {
    const pwHash = bitcoin.crypto.sha256(Buffer.from(passphrase));

    const ECPairAPI = ECPairFactory(tinysecp);
    const keyPair = ECPairAPI.fromPrivateKey(pwHash, {network: ecpairNetwork});
    const publicKey = keyPair.publicKey;
    const privateKey = keyPair.privateKey && Buffer.from(keyPair.privateKey);

    return {
      network,
      keyPair,
      address: bitcoin.payments.p2pkh({
        pubkey: publicKey,
        network: ecpairNetwork,
      }).address,
      // DOGE private key is a regular 256-bit key
      privateKey: privateKey?.toString('hex'), // regular 256-bit (32 bytes, 64 characters) private key
      privateKeyWIF: keyPair.toWIF(), // Wallet Import Format (52 base58 characters)
    };
  },
  isValidAddress: (address: string) =>
    typeof address === 'string' && RE_DOGE_ADDRESS.test(address),
};
