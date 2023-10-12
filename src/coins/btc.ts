import bitcoin from 'bitcoinjs-lib';
import {ECPairFactory} from 'ecpair';
import tinysecp from 'tiny-secp256k1';

import coininfo from 'coininfo';

const RE_BTC_ADDRESS = /^(bc1|[13])[a-km-zA-HJ-NP-Z02-9]{25,39}$/;

const network = coininfo.bitcoin.main.toBitcoinJS();

export const btc = {
  keys: (passPhrase: string) => {
    const pwHash = bitcoin.crypto.sha256(Buffer.from(passPhrase));

    const ECPairAPI = ECPairFactory(tinysecp);
    const keyPair = ECPairAPI.fromPrivateKey(pwHash, {network});

    return {
      network,
      keyPair,
      address: bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network})
        .address,
      // BTC private key is a regular 256-bit key
      privateKey: keyPair.privateKey?.toString('hex'), // regular 256-bit (32 bytes, 64 characters) private key
      privateKeyWIF: keyPair.toWIF(), // Wallet Import Format (52 base58 characters)
    };
  },

  isValidAddress: (address: string) =>
    typeof address === 'string' && RE_BTC_ADDRESS.test(address),
};
