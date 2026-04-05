import Database from 'better-sqlite3-multiple-ciphers'
import argon2 from 'argon2'
import path from 'path'
import { loadEntropyKey } from '../lib/crypto/keystore'
import { deriveSubKey } from '../lib/crypto/entropy'

async function updateAdmin() {
  const SECURITY_DIR = process.env.SECURITY_DIR || '/app/data/security'
  const DB_PATH      = path.join(SECURITY_DIR, 'homeforge.db')
  
  try {
    const entropyKey = loadEntropyKey()
    const dbKey      = deriveSubKey(entropyKey, 'sqlite-db-v1', 32).toString('hex')

    const db = new Database(DB_PATH)
    db.pragma(`key = "x'${dbKey}'"`)

    const NEW_USERNAME = 'admin'
    const NEW_PASSWORD = 'adminadminadmin'
    
    const hash = await argon2.hash(NEW_PASSWORD, {
      type:        argon2.argon2id,
      memoryCost:  65536,
      timeCost:    3,
      parallelism: 4,
    })

    // Update both username and password for the existing record
    const info = db
      .prepare('UPDATE users SET username = ?, password_hash = ? WHERE username = ?')
      .run(NEW_USERNAME, hash, 'basilsuhail')

    if (info.changes > 0) {
      console.log('--------------------------------------------------')
      console.log('✅ Update successful!')
      console.log(`🔗 New Username: ${NEW_USERNAME}`)
      console.log(`🔑 New Password: ${NEW_PASSWORD}`)
      console.log('--------------------------------------------------')
    } else {
      console.error('Error: Original user basilsuhail not found.')
    }
  } catch (err) {
    console.error('Failed to update user:', err)
  }
}

updateAdmin().catch(console.error)
