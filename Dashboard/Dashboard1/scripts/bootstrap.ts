/**
 * bootstrap.ts — runs at every container start (before Next.js).
 *
 * Pre-setup:  No entropy key yet. Uses ephemeral random SESSION_SECRET / WS_SECRET
 *             and a UUID-derived DB_KEY (stable across pre-setup boots, no sensitive
 *             data in the DB at this point).
 *
 * Post-setup: Loads and decrypts the entropy key, derives SESSION_SECRET, WS_SECRET,
 *             and DB_KEY via HKDF-SHA512, exports them for Next.js and custom-server.
 */
import { randomBytes, pbkdf2Sync } from 'crypto'
import { isFirstRun, loadEntropyKey, loadOrCreateUUID } from '../lib/crypto/keystore'
import { deriveSubKey } from '../lib/crypto/entropy'

function main(): void {
  let sessionSecret: string
  let wsSecret:      string
  let dbKey:         string

  if (isFirstRun()) {
    // Entropy key not yet established — user must complete /setup first.
    // Use throwaway random secrets for the session and WS ticket layers.
    // The DB key is derived from the machine UUID so it stays consistent
    // across pre-setup reboots (the DB only holds setup_complete=0 at this point).
    sessionSecret = randomBytes(32).toString('hex')
    wsSecret      = randomBytes(32).toString('hex')

    const uuid     = loadOrCreateUUID()
    const preSetupSalt = Buffer.from('homeforge-presetup-db-v1', 'utf8')
    dbKey = pbkdf2Sync(uuid, preSetupSalt, 100_000, 32, 'sha256').toString('hex')

    const sep = '='.repeat(72)
    process.stderr.write(`\n${sep}\n`)
    process.stderr.write(`  HOMEFORGE: Setup not yet completed.\n`)
    process.stderr.write(`  Open http://localhost:3069 and follow the /setup wizard.\n`)
    process.stderr.write(`  Your encryption key will be generated from your mouse movements.\n`)
    process.stderr.write(`${sep}\n\n`)
  } else {
    // Normal operation — load the entropy key and derive all stable secrets.
    const entropyKey  = loadEntropyKey()
    sessionSecret = deriveSubKey(entropyKey, 'iron-session-v1', 32).toString('hex')
    wsSecret      = deriveSubKey(entropyKey, 'ws-auth-v1',      32).toString('hex')
    dbKey         = deriveSubKey(entropyKey, 'sqlite-db-v1',    32).toString('hex')
  }

  // Write shell-eval-compatible exports to stdout.
  // start.sh does: eval $(node /app/scripts/bootstrap.js)
  process.stdout.write(`export SESSION_SECRET="${sessionSecret}"\n`)
  process.stdout.write(`export WS_SECRET="${wsSecret}"\n`)
  process.stdout.write(`export DB_KEY="${dbKey}"\n`)
}

main()
