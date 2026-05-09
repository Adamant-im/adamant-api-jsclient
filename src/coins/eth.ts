import {mnemonicToSeedSync} from 'bip39';
import hdkey from 'hdkey';
import {bufferToHex, privateToAddress} from 'ethereumjs-util';

const HD_KEY_PATH = "m/44'/60'/3'/1/0";

export const eth = {
  keys: (passphrase: string) => {
    const seed = mnemonicToSeedSync(passphrase);
    const privateKey = hdkey
      .fromMasterSeed(seed)
      .derive(HD_KEY_PATH).privateKey;

    if (!privateKey) {
      throw new Error('Unable to derive Ethereum private key');
    }

    return {
      address: bufferToHex(privateToAddress(privateKey)),
      privateKey: bufferToHex(privateKey),
    };
  },
};
