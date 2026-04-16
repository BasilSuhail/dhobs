#!/bin/sh
set -eu

if [ "$#" -lt 4 ]; then
  echo "usage: $0 <tcp|http> <target> <port|timeout> <timeout|label> [label]" >&2
  exit 64
fi

MODE="$1"
TARGET="$2"

case "$MODE" in
  tcp)
    PORT="$3"
    TIMEOUT="$4"
    LABEL="${5:-$TARGET:$PORT}"
    ;;
  http)
    PORT=""
    TIMEOUT="$3"
    LABEL="${4:-$TARGET}"
    ;;
  *)
    echo "[waiter] unknown mode: $MODE" >&2
    exit 64
    ;;
esac

check_tcp() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$TARGET" "$PORT" <<'PY'
import socket, sys
host = sys.argv[1]
port = int(sys.argv[2])
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.settimeout(1.5)
try:
    sock.connect((host, port))
except OSError:
    sys.exit(1)
finally:
    sock.close()
PY
    return $?
  fi

  if command -v php >/dev/null 2>&1; then
    php -r '
$host=$argv[1];
$port=(int)$argv[2];
$errno=0;
$errstr="";
$fp=@fsockopen($host,$port,$errno,$errstr,1.5);
if ($fp === false) exit(1);
fclose($fp);
' "$TARGET" "$PORT"
    return $?
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z "$TARGET" "$PORT"
    return $?
  fi

  echo "[waiter] no tcp probe available for $LABEL" >&2
  exit 69
}

check_http() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "$TARGET" >/dev/null
    return $?
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q -T 2 -O /dev/null "$TARGET"
    return $?
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "$TARGET" <<'PY'
import sys, urllib.request
try:
    with urllib.request.urlopen(sys.argv[1], timeout=2) as response:
        sys.exit(0 if response.status < 400 else 1)
except Exception:
    sys.exit(1)
PY
    return $?
  fi

  echo "[waiter] no http probe available for $LABEL" >&2
  exit 69
}

echo "[waiter] waiting for $LABEL"

ATTEMPT=0
while [ "$ATTEMPT" -lt "$TIMEOUT" ]; do
  if [ "$MODE" = "tcp" ]; then
    check_tcp && {
      echo "[waiter] ready: $LABEL"
      exit 0
    }
  else
    check_http && {
      echo "[waiter] ready: $LABEL"
      exit 0
    }
  fi

  ATTEMPT=$((ATTEMPT + 1))
  sleep 1
done

echo "[waiter] timeout after ${TIMEOUT}s: $LABEL" >&2
exit 1
