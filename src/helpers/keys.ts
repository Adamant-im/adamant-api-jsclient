import sodium from "sodium-browserify-tweetnacl";
import crypto from "crypto";
import { mnemonicToSeedSync, generateMnemonic } from "bip39";

import * as bignum from "./bignumber";

export interface KeyPair {
  publicKey: Buffer;
  privateKey: Buffer;
}

export const createNewPassPhrase = () => generateMnemonic();

export const makeKeypairFromHash = (hash: Buffer): KeyPair => {
  const keypair = sodium.crypto_sign_seed_keypair(hash);

  return {
    publicKey: keypair.publicKey,
    privateKey: keypair.secretKey,
  };
};

export const createHashFromPassPhrase = (passphrase: string) =>
  crypto
    .createHash("sha256")
    .update(mnemonicToSeedSync(passphrase).toString("hex"), "hex")
    .digest();

export const createKeypairFromPassPhrase = (passphrase: string) => {
  const hash = createHashFromPassPhrase(passphrase);

  return makeKeypairFromHash(hash);
};

export const createAddressFromPublicKey = (
  publicKey: Buffer | string,
): `U${string}` => {
  const hash = crypto.createHash("sha256");

  if (typeof publicKey === "string") {
    hash.update(publicKey, "hex");
  } else {
    hash.update(publicKey);
  }

  const publicKeyBuffer = hash.digest();

  const temp = Buffer.alloc(8);

  for (let i = 1; i <= 8; i++) {
    temp[i] = publicKeyBuffer[8 - i];
  }

  return `U${bignum.fromBuffer(temp)}`;
};
