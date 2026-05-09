import * as bitcoin from 'bitcoinjs-lib';
import {ECPairFactory} from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';

import coininfo from 'coininfo';

const toECPairNetwork = (
  networkInfo: ReturnType<typeof coininfo.bitcoin.main.toBitcoinJS>
) => {
  const network = {
    messagePrefix: networkInfo.messagePrefix,
    bech32: networkInfo.bech32 ?? 'btc',
    bip32: networkInfo.bip32,
    pubKeyHash: networkInfo.pubKeyHash,
    scriptHash: networkInfo.scriptHash,
    wif: networkInfo.wif,
  };

  return network;
};

const RE_BTC_ADDRESS = /^(bc1|[13])[a-km-zA-HJ-NP-Z02-9]{25,39}$/;

const network = coininfo.bitcoin.main.toBitcoinJS();
const ecpairNetwork = toECPairNetwork(network);

export const btc = {
  keys: (passphrase: string) => {
    const pwHash = bitcoin.crypto.sha256(Buffer.from(passphrase));

    const ECPairAPI = ECPairFactory(tinysecp);
    const keyPair = ECPairAPI.fromPrivateKey(pwHash, {network: ecpairNetwork});
    const publicKey = Buffer.from(keyPair.publicKey);
    const privateKey = keyPair.privateKey && Buffer.from(keyPair.privateKey);

    return {
      network,
      keyPair,
      address: bitcoin.payments.p2pkh({
        pubkey: publicKey,
        network: ecpairNetwork,
      }).address,
      // BTC private key is a regular 256-bit key
      privateKey: privateKey?.toString('hex'), // regular 256-bit (32 bytes, 64 characters) private key
      privateKeyWIF: keyPair.toWIF(), // Wallet Import Format (52 base58 characters)
    };
  },

  isValidAddress: (address: string) =>
    typeof address === 'string' && RE_BTC_ADDRESS.test(address),
};
