#!/bin/bash
# Migrates existing .env secrets to Docker Secrets files.
# Run this BEFORE `docker compose up -d`.
# Note: Using -eo pipefail instead of -u to avoid unbound variable errors if .env is partial.
set -eo pipefail

SECRETS_DIR="./data/secrets"
mkdir -p "$SECRETS_DIR"

declare -A ENV_TO_SECRET=(
  ["MYSQL_ROOT_PASSWORD"]="mysql_root_password"
  ["MYSQL_PASSWORD"]="mysql_password"
  ["NEXTCLOUD_ADMIN_PASSWORD"]="nextcloud_admin_password"
  ["COLLABORA_PASSWORD"]="collabora_password"
  ["MATRIX_REGISTRATION_SECRET"]="matrix_registration_secret"
  ["MATRIX_MACAROON_SECRET_KEY"]="matrix_macaroon_secret_key"
  ["MATRIX_FORM_SECRET"]="matrix_form_secret"
  ["WEBUI_SECRET_KEY"]="webui_secret_key"
  ["VPN_ADMIN_PASSWORD"]="vpn_admin_password"
)

echo "🔐 Migrating secrets to Docker Secrets..."

for ENV_VAR in "${!ENV_TO_SECRET[@]}"; do
  SECRET_FILE="${ENV_TO_SECRET[$ENV_VAR]}"
  SECRET_PATH="$SECRETS_DIR/$SECRET_FILE"
  
  if [ -f "$SECRET_PATH" ]; then
    echo "   ✅ $SECRET_FILE already exists."
    continue
  fi

  VALUE=$(grep "^${ENV_VAR}=" .env 2>/dev/null | cut -d'=' -f2-)
  if [ -z "$VALUE" ]; then
    echo "   ⚠️  $ENV_VAR not found in .env — generating random secret."
    VALUE=$(openssl rand -hex 32)
  fi

  echo "$VALUE" > "$SECRET_PATH"
  chmod 600 "$SECRET_PATH"
  echo "   ✅ Created $SECRET_FILE"
done

echo ""
echo "✅ Migration complete. Please backup your $SECRETS_DIR."
