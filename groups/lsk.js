const coinNetworks = require('./coinNetworks');
const pbkdf2 = require('pbkdf2');
const sodium = require('sodium-browserify-tweetnacl')
const cryptography = require('@liskhq/lisk-cryptography')
const {bytesToHex} = require("../helpers/encryptor");
const lsk = {}

const LiskHashSettings = {
    SALT: 'adm',
    ITERATIONS: 2048,
    KEYLEN: 32,
    DIGEST: 'sha256'
}

/**
 * Generates a LSK account from the passphrase specified.
 * @param {string} passphrase ADAMANT account passphrase
 * @returns {object} network info, keyPair, address, addressHexBinary, addressHex, privateKey
 */

lsk.keys = passphrase => {
    const network = coinNetworks.LSK
    const liskSeed = pbkdf2.pbkdf2Sync(passphrase, LiskHashSettings.SALT, LiskHashSettings.ITERATIONS, LiskHashSettings.KEYLEN, LiskHashSettings.DIGEST)
    const keyPair = sodium.crypto_sign_seed_keypair(liskSeed)
    const address = cryptography.getBase32AddressFromPublicKey(keyPair.publicKey)
	const addressHexBinary = cryptography.getAddressFromPublicKey(keyPair.publicKey)
	const addressHex = bytesToHex(addressHexBinary)
    const privateKey = keyPair.secretKey.toString('hex')

    return {
        network,
        keyPair,
        address,
		addressHexBinary,
		addressHex,
        privateKey
    }
};

module.exports = lsk;
