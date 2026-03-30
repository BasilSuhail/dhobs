#!/bin/sh
# Start the WebSocket terminal server in background, then Next.js in foreground
node /app/custom-server.js &
exec node /app/server.js
