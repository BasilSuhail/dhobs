"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFirstRun = isFirstRun;
exports.storeEntropyKey = storeEntropyKey;
exports.loadEntropyKey = loadEntropyKey;
const fs_1 = require("fs");
const os_1 = require("os");
const crypto_1 = require("crypto");
const entropy_1 = require("./entropy");
function getSecurityDir() {
    return process.env.SECURITY_DIR || '/app/data/security';
}
function getUUIDPath() { return `${getSecurityDir()}/.homeforge.uuid`; }
function getKeyPath() { return `${getSecurityDir()}/.homeforge.key`; }
function ensureSecurityDir() {
    const dir = getSecurityDir();
    if (!(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true, mode: 0o700 });
}
function loadOrCreateUUID() {
    const path = getUUIDPath();
    if ((0, fs_1.existsSync)(path))
        return (0, fs_1.readFileSync)(path, 'utf8').trim();
    const uuid = (0, crypto_1.randomUUID)();
    ensureSecurityDir();
    (0, fs_1.writeFileSync)(path, uuid, { mode: 0o600 });
    return uuid;
}
/** Returns true if the encrypted key file does not yet exist (setup not yet completed). */
function isFirstRun() {
    return !(0, fs_1.existsSync)(getKeyPath());
}
/**
 * Encrypt and persist a user-supplied entropy key to disk.
 * The key is provided by the client (derived from mouse entropy + CSPRNG) during /setup.
 * Throws if the key file already exists — call isFirstRun() first.
 */
function storeEntropyKey(entropyKey) {
    if (entropyKey.length !== 64) {
        throw new Error(`Entropy key must be exactly 64 bytes, got ${entropyKey.length}`);
    }
    ensureSecurityDir();
    const uuid = loadOrCreateUUID();
    const pbkdf2Salt = (0, entropy_1.randomKey)(32).toString('hex');
    const passphrase = (0, os_1.hostname)() + ':' + uuid;
    const wrapKey = (0, entropy_1.deriveWrappingKey)(passphrase, pbkdf2Salt);
    const { iv, authTag, ciphertext } = (0, entropy_1.aesEncrypt)(entropyKey, wrapKey);
    const keyFile = { version: 1, pbkdf2Salt, iv, authTag, ciphertext };
    (0, fs_1.writeFileSync)(getKeyPath(), JSON.stringify(keyFile, null, 2), { mode: 0o600 });
    (0, fs_1.chmodSync)(getKeyPath(), 0o600);
}
/**
 * Load and decrypt the entropy key from disk.
 * Throws if the file is missing or the AES-GCM auth tag fails (tampered file).
 */
function loadEntropyKey() {
    const path = getKeyPath();
    if (!(0, fs_1.existsSync)(path)) {
        throw new Error('Entropy key not yet established. Complete the /setup wizard first.');
    }
    const keyFile = JSON.parse((0, fs_1.readFileSync)(path, 'utf8'));
    if (keyFile.version !== 1) {
        throw new Error(`Unknown key file version: ${keyFile.version}`);
    }
    const uuid = loadOrCreateUUID();
    const passphrase = (0, os_1.hostname)() + ':' + uuid;
    const wrapKey = (0, entropy_1.deriveWrappingKey)(passphrase, keyFile.pbkdf2Salt);
    // aesDecrypt throws if the auth tag doesn't match — tamper detection
    return (0, entropy_1.aesDecrypt)(keyFile.ciphertext, wrapKey, keyFile.iv, keyFile.authTag);
}
