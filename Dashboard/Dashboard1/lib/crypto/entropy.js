"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveWrappingKey = deriveWrappingKey;
exports.aesEncrypt = aesEncrypt;
exports.aesDecrypt = aesDecrypt;
exports.deriveSubKey = deriveSubKey;
exports.randomKey = randomKey;
const crypto_1 = require("crypto");
const PBKDF2_ITERATIONS = 210000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha512';
/**
 * Derive a 256-bit AES wrapping key from a passphrase using PBKDF2-SHA512.
 * @param passphrase - hostname + ':' + uuid
 * @param salt       - 32-byte random salt as hex string
 */
function deriveWrappingKey(passphrase, salt) {
    return (0, crypto_1.pbkdf2Sync)(passphrase, Buffer.from(salt, 'hex'), PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
}
/**
 * Encrypt a plaintext Buffer with AES-256-GCM.
 * Returns iv, authTag, and ciphertext as hex strings.
 */
function aesEncrypt(plaintext, key) {
    const iv = (0, crypto_1.randomBytes)(12);
    const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex'),
        ciphertext: ct.toString('hex'),
    };
}
/**
 * Decrypt AES-256-GCM ciphertext.
 * Throws if the authentication tag doesn't match (tampered or wrong key).
 */
function aesDecrypt(ciphertext, key, iv, authTag) {
    const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'hex')),
        decipher.final(),
    ]);
}
/**
 * Derive a sub-key from the master entropy key using HKDF-SHA512.
 * @param entropyKey - 64-byte master secret
 * @param info       - purpose label, e.g. "iron-session-v1"
 * @param length     - output key length in bytes (default 32)
 */
function deriveSubKey(entropyKey, info, length = 32) {
    return Buffer.from((0, crypto_1.hkdfSync)('sha512', entropyKey, 'homeforge', info, length));
}
/** Generate cryptographically random bytes. */
function randomKey(bytes = 64) {
    return (0, crypto_1.randomBytes)(bytes);
}
