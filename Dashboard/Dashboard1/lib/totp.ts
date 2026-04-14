import { generateSecret, generateURI, verify, type OTPVerifyOptions } from 'otplib'
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble'
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure'
import * as QRCode from 'qrcode'

// Set up otplib v13 plugins
const cryptoPlugin = new NobleCryptoPlugin()
const base32Plugin = new ScureBase32Plugin()

const defaultPlugins = {
  crypto: cryptoPlugin,
  base32: base32Plugin,
}

/**
 * Generate a random 20-byte base32 secret (128-bit entropy).
 */
export function generateTotpSecret(): string {
  return generateSecret({ length: 20, ...defaultPlugins })
}

/**
 * Generate the otpauth:// URI for QR code scanning.
 */
export function generateTotpUri(
  secret: string,
  username: string,
  issuer: string = 'HomeForge'
): string {
  return generateURI({
    secret,
    label: username,
    issuer,
    strategy: 'totp',
    digits: 6,
    period: 30,
  })
}

/**
 * Verify a TOTP code against a secret.
 */
export async function verifyTotpCode(code: string, secret: string): Promise<boolean> {
  const result = await verify({
    token: code,
    secret,
    strategy: 'totp',
    epochTolerance: 30, // ±1 window
    ...defaultPlugins,
  })
  return result.valid
}

/**
 * Generate a QR code as a base64 data URI.
 */
export async function generateQrDataUri(totpUri: string): Promise<string> {
  return QRCode.toDataURL(totpUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 200,
  })
}
