import * as cryptography from '@liskhq/lisk-cryptography';
import sodium from 'sodium-browserify-tweetnacl';
import pbkdf2 from 'pbkdf2';
import {bytesToHex} from '../helpers/encryptor';

const LiskHashSettings = {
  SALT: 'adm',
  ITERATIONS: 2048,
  KEYLEN: 32,
  DIGEST: 'sha256',
};

const network = {
  name: 'Lisk',
  port: 8000,
  wsPort: 8001,
  unit: 'LSK',
};

export const lsk = {
  keys: (passphrase: string) => {
    const liskSeed = pbkdf2.pbkdf2Sync(
      passphrase,
      LiskHashSettings.SALT,
      LiskHashSettings.ITERATIONS,
      LiskHashSettings.KEYLEN,
      LiskHashSettings.DIGEST
    );
    const keyPair = sodium.crypto_sign_seed_keypair(liskSeed);
    const address = cryptography.getBase32AddressFromPublicKey(
      keyPair.publicKey
    );
    const addressHexBinary = cryptography.getAddressFromPublicKey(
      keyPair.publicKey
    );
    const addressHex = bytesToHex(addressHexBinary);
    const privateKey = keyPair.secretKey.toString('hex');

    return {
      network,
      keyPair,
      address,
      addressHexBinary,
      addressHex,
      privateKey,
    };
  },
};
