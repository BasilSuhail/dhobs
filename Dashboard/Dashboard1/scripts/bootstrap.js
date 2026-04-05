"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * bootstrap.ts — runs at every container start (before Next.js).
 *
 * Pre-setup:  The entropy key has not been created yet (user generates it via
 *             mouse entropy in the /setup wizard). Bootstrap outputs ephemeral
 *             random secrets that are only valid for this boot. Sessions created
 *             before setup completes will be invalidated on the next restart —
 *             this is intentional and acceptable since the only page accessible
 *             before setup is /setup itself.
 *
 * Post-setup: Loads and decrypts the user-created entropy key from disk, derives
 *             SESSION_SECRET and WS_SECRET via HKDF, and exports them to the
 *             shell environment via start.sh eval.
 */
const crypto_1 = require("crypto");
const keystore_1 = require("../lib/crypto/keystore");
const entropy_1 = require("../lib/crypto/entropy");
function main() {
    let sessionSecret;
    let wsSecret;
    if ((0, keystore_1.isFirstRun)()) {
        // Entropy key not yet established — user must complete /setup first.
        // Use throwaway random secrets so the setup page can render and operate.
        // These secrets change on every boot until setup is completed.
        sessionSecret = (0, crypto_1.randomBytes)(32).toString('hex');
        wsSecret = (0, crypto_1.randomBytes)(32).toString('hex');
        const sep = '='.repeat(72);
        process.stderr.write(`\n${sep}\n`);
        process.stderr.write(`  HOMEFORGE: Setup not yet completed.\n`);
        process.stderr.write(`  Open http://localhost:3069 and follow the /setup wizard.\n`);
        process.stderr.write(`  Your entropy key will be generated from your mouse movements.\n`);
        process.stderr.write(`${sep}\n\n`);
    }
    else {
        // Normal operation — load the user-created entropy key and derive stable secrets
        const entropyKey = (0, keystore_1.loadEntropyKey)();
        sessionSecret = (0, entropy_1.deriveSubKey)(entropyKey, 'iron-session-v1', 32).toString('hex');
        wsSecret = (0, entropy_1.deriveSubKey)(entropyKey, 'ws-auth-v1', 32).toString('hex');
    }
    // Write shell-eval-compatible exports to stdout
    // start.sh does: eval $(node /app/scripts/bootstrap.js)
    process.stdout.write(`export SESSION_SECRET="${sessionSecret}"\n`);
    process.stdout.write(`export WS_SECRET="${wsSecret}"\n`);
}
main();
