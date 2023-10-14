import bitcoin from 'bitcoinjs-lib';
import {ECPairFactory} from 'ecpair';
import tinysecp from 'tiny-secp256k1';

import coininfo from 'coininfo';

const RE_DOGE_ADDRESS = /^[A|D|9][A-Z0-9]([0-9a-zA-Z]{9,})$/;

const network = coininfo.dogecoin.main.toBitcoinJS();

export const doge = {
  keys: (passphrase: string) => {
    const pwHash = bitcoin.crypto.sha256(Buffer.from(passphrase));

    const ECPairAPI = ECPairFactory(tinysecp);
    const keyPair = ECPairAPI.fromPrivateKey(pwHash, {network});

    return {
      network,
      keyPair,
      address: bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network})
        .address,
      // DOGE private key is a regular 256-bit key
      privateKey: keyPair.privateKey?.toString('hex'), // regular 256-bit (32 bytes, 64 characters) private key
      privateKeyWIF: keyPair.toWIF(), // Wallet Import Format (52 base58 characters)
    };
  },
  isValidAddress: (address: string) =>
    typeof address === 'string' && RE_DOGE_ADDRESS.test(address),
};
