declare module "sodium-browserify-tweetnacl" {
  namespace sodium {
    export function crypto_sign_seed_keypair(seed: Buffer): {
      publicKey: Buffer;
      secretKey: Buffer;
    };

    export function crypto_sign_detached(
      hash: Buffer,
      privateKey: Buffer,
    ): Buffer;

    export function randombytes(nonce: Buffer): void;
  }

  export = sodium;
}
