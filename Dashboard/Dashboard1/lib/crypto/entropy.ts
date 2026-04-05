import {
  randomBytes,
  hkdfSync,
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
} from 'crypto'

const PBKDF2_ITERATIONS = 210_000
const PBKDF2_KEYLEN     = 32
const PBKDF2_DIGEST     = 'sha512'

/**
 * Derive a 256-bit AES wrapping key from a passphrase using PBKDF2-SHA512.
 * @param passphrase - hostname + ':' + uuid
 * @param salt       - 32-byte random salt as hex string
 */
export function deriveWrappingKey(passphrase: string, salt: string): Buffer {
  return pbkdf2Sync(
    passphrase,
    Buffer.from(salt, 'hex'),
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  )
}

/**
 * Encrypt a plaintext Buffer with AES-256-GCM.
 * Returns iv, authTag, and ciphertext as hex strings.
 */
export function aesEncrypt(
  plaintext: Buffer,
  key: Buffer
): { iv: string; authTag: string; ciphertext: string } {
  const iv     = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct     = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return {
    iv:         iv.toString('hex'),
    authTag:    cipher.getAuthTag().toString('hex'),
    ciphertext: ct.toString('hex'),
  }
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Throws if the authentication tag doesn't match (tampered or wrong key).
 */
export function aesDecrypt(
  ciphertext: string,
  key: Buffer,
  iv: string,
  authTag: string
): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ])
}

/**
 * Derive a sub-key from the master entropy key using HKDF-SHA512.
 * @param entropyKey - 64-byte master secret
 * @param info       - purpose label, e.g. "iron-session-v1"
 * @param length     - output key length in bytes (default 32)
 */
export function deriveSubKey(
  entropyKey: Buffer,
  info: string,
  length: number = 32
): Buffer {
  return Buffer.from(
    hkdfSync('sha512', entropyKey, 'homeforge', info, length)
  )
}

/** Generate cryptographically random bytes. */
export function randomKey(bytes: number = 64): Buffer {
  return randomBytes(bytes)
}
