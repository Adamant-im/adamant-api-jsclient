import bitcoin from 'bitcoinjs-lib';
import {ECPairFactory} from 'ecpair';
import tinysecp from 'tiny-secp256k1';

import coininfo from 'coininfo';

const RE_DASH_ADDRESS = /^[7X][1-9A-HJ-NP-Za-km-z]{33,}$/;

const network = coininfo.dash.main.toBitcoinJS();

export const dash = {
  keys: (passphrase: string) => {
    const pwHash = bitcoin.crypto.sha256(Buffer.from(passphrase));

    const ECPairAPI = ECPairFactory(tinysecp);
    const keyPair = ECPairAPI.fromPrivateKey(pwHash, {network});

    return {
      network,
      keyPair,
      address: bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network})
        .address,
      // DASH private key is a regular 256-bit key
      privateKey: keyPair.privateKey?.toString('hex'), // regular 256-bit (32 bytes, 64 characters) private key
      privateKeyWIF: keyPair.toWIF(), // Wallet Import Format (52 base58 characters)
    };
  },
  isValidAddress: (address: string) =>
    typeof address === 'string' && RE_DASH_ADDRESS.test(address),
};
