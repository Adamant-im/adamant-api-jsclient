export interface CoinNetwork {
  messagePrefix: string;
  bech32?: string;
  bip32: {
    public: number;
    private: number;
  };
  pubKeyHash: number;
  scriptHash: number;
  wif: number;
}

export type ECPairNetwork = Omit<CoinNetwork, 'bech32'> & {
  bech32: string;
};

type CoinKeyPairNetwork = Omit<ECPairNetwork, 'messagePrefix'> & {
  messagePrefix: string | Uint8Array;
};

export interface CoinKeyPair {
  publicKey: Uint8Array;
  compressed: boolean;
  network: CoinKeyPairNetwork;
  lowR: boolean;
  privateKey?: Uint8Array;
  toWIF(): string;
  tweak(tweak: Uint8Array): CoinKeyPair;
  sign(hash: Uint8Array, lowR?: boolean): Uint8Array;
  signSchnorr(hash: Uint8Array): Uint8Array;
  verify(hash: Uint8Array, signature: Uint8Array): boolean;
  verifySchnorr(hash: Uint8Array, signature: Uint8Array): boolean;
}

export interface UtxoWalletKeys {
  network: CoinNetwork;
  keyPair: CoinKeyPair;
  address?: string;
  privateKey?: string;
  privateKeyWIF: string;
}

export const toECPairNetwork = (
  networkInfo: CoinNetwork,
  fallbackBech32: string,
): ECPairNetwork => {
  return {
    messagePrefix: networkInfo.messagePrefix,
    bech32: networkInfo.bech32 ?? fallbackBech32,
    bip32: networkInfo.bip32,
    pubKeyHash: networkInfo.pubKeyHash,
    scriptHash: networkInfo.scriptHash,
    wif: networkInfo.wif,
  };
};
