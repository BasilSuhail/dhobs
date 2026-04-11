import { hkdf } from '@noble/hashes/hkdf'
import { sha512 } from '@noble/hashes/sha512'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'

let _backupKey: Buffer | null = null
let _internalToken: string | null = null

const SECURITY_DIR = process.env.SECURITY_DIR || '/data/security'
const KEY_PATH = path.join(SECURITY_DIR, '.homeforge.key')
const UUID_PATH = path.join(SECURITY_DIR, '.homeforge.uuid')

interface KeyFile {
  version:    number
  pbkdf2Salt: string
  iv:         string
  authTag:    string
  ciphertext: string
}

function loadEntropyKey(): Buffer {
  if (!fs.existsSync(KEY_PATH)) throw new Error('Entropy key file missing')
  if (!fs.existsSync(UUID_PATH)) throw new Error('UUID file missing')

  const keyFile: KeyFile = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'))
  const uuid = fs.readFileSync(UUID_PATH, 'utf8').trim()
  
  const dashboardHostname = process.env.DASHBOARD_HOSTNAME || 'homeforge-dashboard'
  const passphrase = dashboardHostname + ':' + uuid
  
  const wrapKey = crypto.pbkdf2Sync(passphrase, Buffer.from(keyFile.pbkdf2Salt, 'hex'), 210000, 32, 'sha512')
  const decipher = crypto.createDecipheriv('aes-256-gcm', wrapKey, Buffer.from(keyFile.iv, 'hex'))
  decipher.setAuthTag(Buffer.from(keyFile.authTag, 'hex'))
  
  return Buffer.concat([decipher.update(Buffer.from(keyFile.ciphertext, 'hex')), decipher.final()])
}

export function getBackupKey(): Buffer {
  if (_backupKey) return _backupKey
  const entropyKey = loadEntropyKey()
  const derived = crypto.hkdfSync('sha512', entropyKey, 'homeforge', 'homeforge-backup-v1', 32)
  _backupKey = Buffer.from(derived)
  return _backupKey
}

export function getBackupKeyHex(): string {
  return getBackupKey().toString('hex')
}

export function getInternalToken(): string {
  if (_internalToken) return _internalToken
  const entropyKey = loadEntropyKey()
  const derived = crypto.hkdfSync('sha512', entropyKey, 'homeforge', 'homeforge-internal-token-v1', 32)
  _internalToken = Buffer.from(derived).toString('hex')
  return _internalToken
}

/**
 * Encrypts a file using AES-256-GCM using streams to handle files > 2GB.
 * The Auth Tag is appended to the end of the file.
 */
export async function encryptArchiveStream(inputPath: string, outputPath: string): Promise<{ ivHex: string, checksum: string }> {
  const key = getBackupKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  
  const readStream = fs.createReadStream(inputPath)
  const writeStream = fs.createWriteStream(outputPath)
  const hash = crypto.createHash('sha256')

  // We track the hash of the ENCRYPTED output
  cipher.on('data', (chunk) => hash.update(chunk))

  await pipeline(readStream, cipher, writeStream)

  // Append Auth Tag (16 bytes) to the end of the encrypted file
  const authTag = cipher.getAuthTag()
  fs.appendFileSync(outputPath, authTag)
  
  // Update hash with the auth tag as well so checksum covers the whole file
  hash.update(authTag)

  return { 
    ivHex: iv.toString('hex'), 
    checksum: hash.digest('hex') 
  }
}

/**
 * Decrypts a file using AES-256-GCM using streams.
 * Expects the last 16 bytes of the file to be the Auth Tag.
 */
export async function decryptArchiveStream(inputPath: string, outputPath: string, ivHex: string) {
  const key = getBackupKey()
  const iv = Buffer.from(ivHex, 'hex')
  
  // Read auth tag from the end of file (last 16 bytes)
  const stats = fs.statSync(inputPath)
  const fd = fs.openSync(inputPath, 'r')
  const authTag = Buffer.alloc(16)
  fs.readSync(fd, authTag, 0, 16, stats.size - 16)
  fs.closeSync(fd)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const readStream = fs.createReadStream(inputPath, { end: stats.size - 17 })
  const writeStream = fs.createWriteStream(outputPath)

  await pipeline(readStream, decipher, writeStream)
}
