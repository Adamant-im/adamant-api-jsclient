import { mnemonicToSeedSync } from "bip39";
import hdkey from "hdkey";
import { bufferToHex, privateToAddress } from "ethereumjs-util";

const HD_KEY_PATH = "m/44'/60'/3'/1/0";

export namespace eth {
  export const keys = (passPhrase: string) => {
    const seed = mnemonicToSeedSync(passPhrase);
    const privateKey = hdkey
      .fromMasterSeed(seed)
      .derive(HD_KEY_PATH).privateKey;

    return {
      address: bufferToHex(privateToAddress(privateKey)),
      privateKey: bufferToHex(privateKey),
    };
  };
}
