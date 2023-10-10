declare module "coininfo" {
  interface Network {
    messagePrefix: string;
    bech32: string;
    bip32: Bip32;
    pubKeyHash: number;
    scriptHash: number;
    wif: number;
  }

  interface Bip32 {
    public: number;
    private: number;
  }

  interface CoinInfo {
    main: {
      toBitcoinJS: () => Network;
    };
  }

  interface Coins {
    bitcoin: CoinInfo;
    dash: CoinInfo;
    dogecoin: CoinInfo;
  }

  const coininfo: Coins
  export = coininfo;
}
