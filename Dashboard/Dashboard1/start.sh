#!/bin/sh
set -e

# Bootstrap: generate/load entropy key and inject derived secrets into the environment.
# bootstrap.js outputs: export SESSION_SECRET="..." followed by export WS_SECRET="..."
# eval injects them so that both custom-server.js and server.js inherit them.
eval $(node /app/scripts/bootstrap.js)

# Fail fast if bootstrap didn't export the required secrets
if [ -z "$SESSION_SECRET" ] || [ -z "$WS_SECRET" ] || [ -z "$DB_KEY" ]; then
  echo "FATAL: bootstrap.js did not export SESSION_SECRET / WS_SECRET / DB_KEY — aborting." >&2
  exit 1
fi

# Start the WebSocket terminal server in background, then Next.js in foreground
node /app/custom-server.js &
exec node /app/server.js
