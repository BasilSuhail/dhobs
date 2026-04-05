# Matrix Synapse Homeserver Configuration
# Generated for Project S HomeForge
# Docs: https://element-hq.github.io/synapse/latest/usage/configuration/config_documentation.html

server_name: "localhost"
pid_file: /data/homeserver.pid

listeners:
  - port: 8008
    tls: false
    type: http
    x_forwarded: true
    resources:
      - names: [client, federation]
        compress: false

database:
  name: psycopg2
  args:
    user: "${MATRIX_DB_USER}"
    password: "${MATRIX_DB_PASSWORD}"
    database: synapse
    host: synapse-db
    port: 5432
    cp_min: 5
    cp_max: 10

log_config: "/data/localhost.log.config"

media_store_path: /data/media_store

registration_shared_secret: "${MATRIX_REGISTRATION_SECRET}"

report_stats: false

macaroon_secret_key: "${MATRIX_MACAROON_SECRET_KEY}"

form_secret: "${MATRIX_FORM_SECRET}"

signing_key_path: "/data/localhost.signing.key"

trusted_key_servers:
  - server_name: "matrix.org"

enable_registration: true
enable_registration_without_verification: true

suppress_key_server_warning: true
