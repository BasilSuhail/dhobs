import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from 'fs'
import { hostname } from 'os'
import { randomUUID } from 'crypto'
import { randomKey, deriveWrappingKey, aesEncrypt, aesDecrypt } from './entropy'

interface KeyFile {
  version:    number
  pbkdf2Salt: string
  iv:         string
  authTag:    string
  ciphertext: string
}

function getSecurityDir(): string {
  return process.env.SECURITY_DIR || '/app/data/security'
}

function getUUIDPath(): string { return `${getSecurityDir()}/.homeforge.uuid` }
function getKeyPath():  string { return `${getSecurityDir()}/.homeforge.key`  }

function ensureSecurityDir(): void {
  const dir = getSecurityDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
}

export function loadOrCreateUUID(): string {
  const path = getUUIDPath()
  if (existsSync(path)) return readFileSync(path, 'utf8').trim()
  const uuid = randomUUID()
  ensureSecurityDir()
  writeFileSync(path, uuid, { mode: 0o600 })
  return uuid
}

/** Returns true if the encrypted key file does not yet exist (setup not yet completed). */
export function isFirstRun(): boolean {
  return !existsSync(getKeyPath())
}

/**
 * Encrypt and persist a user-supplied entropy key to disk.
 * The key is provided by the client (derived from mouse entropy + CSPRNG) during /setup.
 * Throws if the key file already exists — call isFirstRun() first.
 */
export function storeEntropyKey(entropyKey: Buffer): void {
  if (entropyKey.length !== 64) {
    throw new Error(`Entropy key must be exactly 64 bytes, got ${entropyKey.length}`)
  }
  ensureSecurityDir()
  const uuid       = loadOrCreateUUID()
  const pbkdf2Salt = randomKey(32).toString('hex')
  const passphrase = hostname() + ':' + uuid
  const wrapKey    = deriveWrappingKey(passphrase, pbkdf2Salt)

  const { iv, authTag, ciphertext } = aesEncrypt(entropyKey, wrapKey)

  const keyFile: KeyFile = { version: 1, pbkdf2Salt, iv, authTag, ciphertext }
  writeFileSync(getKeyPath(), JSON.stringify(keyFile, null, 2), { mode: 0o600 })
  chmodSync(getKeyPath(), 0o600)
}

/**
 * Load and decrypt the entropy key from disk.
 * Throws if the file is missing or the AES-GCM auth tag fails (tampered file).
 */
export function loadEntropyKey(): Buffer {
  const path = getKeyPath()
  if (!existsSync(path)) {
    throw new Error('Entropy key not yet established. Complete the /setup wizard first.')
  }

  const keyFile: KeyFile = JSON.parse(readFileSync(path, 'utf8'))
  if (keyFile.version !== 1) {
    throw new Error(`Unknown key file version: ${keyFile.version}`)
  }

  const uuid       = loadOrCreateUUID()
  const passphrase = hostname() + ':' + uuid
  const wrapKey    = deriveWrappingKey(passphrase, keyFile.pbkdf2Salt)

  // aesDecrypt throws if the auth tag doesn't match — tamper detection
  return aesDecrypt(keyFile.ciphertext, wrapKey, keyFile.iv, keyFile.authTag)
}
