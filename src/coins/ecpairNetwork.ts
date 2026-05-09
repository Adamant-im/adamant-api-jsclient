import type {Network} from 'coininfo';

export type ECPairNetwork = Omit<Network, 'bech32'> & {
  bech32: string;
};

export const toECPairNetwork = (
  networkInfo: Network,
  fallbackBech32: string
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
