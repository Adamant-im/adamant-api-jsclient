declare module "coininfo" {
  export interface Network {
    messagePrefix: string;
    bech32: string;
    bip32: Bip32;
    pubKeyHash: number;
    scriptHash: number;
    wif: number;
  }

  export interface Bip32 {
    public: number;
    private: number;
  }

  export interface CoinInfo {
    main: {
      toBitcoinJS: () => Network;
    };
  }

  export interface Coins {
    bitcoin: CoinInfo;
    dash: CoinInfo;
    dogecoin: CoinInfo;
  }

  const coininfo: Coins
  export default coininfo;
}
