#!/bin/sh
set -eu

CERT_DIR="/var/lib/mysql"
CERT_FILE="$CERT_DIR/server-cert.pem"
KEY_FILE="$CERT_DIR/server-key.pem"

if [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  rm -f "$CERT_FILE" "$KEY_FILE"
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days "${MYSQL_CERT_DAYS:-3650}" \
    -subj "/CN=${MYSQL_CERT_CN:-db-lobbypack}" \
    >/dev/null 2>&1

  chown mysql:mysql "$CERT_FILE" "$KEY_FILE"
  chmod 644 "$CERT_FILE"
  chmod 600 "$KEY_FILE"
fi

exec docker-entrypoint.sh "$@"
