server_name: "${HOMESERVER_SERVER_NAME}"
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
    user: synapse
    password: "${HOMESERVER_DB_PASS}"
    database: synapse
    host: synapse-db
    cp_min: 5
    cp_max: 10
log_config: "/data/localhost.log.config"
media_store_path: /data/media_store
registration_shared_secret: "${HOMESERVER_REG_KEY}"
macaroon_secret_key: "${HOMESERVER_MAC_KEY}"
form_secret: "${HOMESERVER_FORM_KEY}"
report_stats: false
