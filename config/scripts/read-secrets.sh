#!/bin/sh
# Reads secrets from files and exports them as env vars for services that don't support _FILE vars
if [ -n "$WEBUI_SECRET_KEY_FILE" ] && [ -f "$WEBUI_SECRET_KEY_FILE" ]; then
  export WEBUI_SECRET_KEY=$(cat "$WEBUI_SECRET_KEY_FILE")
fi
if [ -n "$OPENVPN_ADMIN_PASSWORD_FILE" ] && [ -f "$OPENVPN_ADMIN_PASSWORD_FILE" ]; then
  export OPENVPN_ADMIN_PASSWORD=$(cat "$OPENVPN_ADMIN_PASSWORD_FILE")
fi
if [ -n "$COLLABORA_PASSWORD_FILE" ] && [ -f "$COLLABORA_PASSWORD_FILE" ]; then
  export COLLABORA_PASSWORD=$(cat "$COLLABORA_PASSWORD_FILE")
fi
exec "$@"
