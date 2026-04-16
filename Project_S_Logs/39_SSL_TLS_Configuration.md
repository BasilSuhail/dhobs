# 39 — SSL/TLS Configuration (Phase 11)

Date: 2026-04-10
Author: Author
Related Issue: #188
Branch: `phase-11/ssl-tls`
PR: TBD

---

## Context

All 12 nginx ports were exposed on LAN in plain HTTP. No defense against network sniffing, credential interception, or man-in-the-middle attacks on the LAN. Architecture review (#182) scored this as High severity.

---

## Changes Made

### 1. Self-Signed Certificate Generation

Added `scripts/generate-cert.sh` — generates a self-signed certificate for the LAN IP:
- 365-day validity
- 2048-bit RSA key
- Subject Alternative Name (SAN) for the LAN IP + localhost
- Stored in `config/nginx/ssl/`

Users run it once: `bash scripts/generate-cert.sh <LAN_IP>`

### 2. Nginx SSL Configuration

Updated `config/nginx/nginx.conf`:
- Added SSL server block listening on port 443
- Redirects HTTP (8088) → HTTPS (443) for security
- SSL protocols: TLSv1.2, TLSv1.3 only (no SSLv3, TLSv1.0, TLSv1.1)
- Strong cipher suite (ECDHE+AESGCM, ECDHE+CHACHA20)
- HSTS header enabled (max-age=31536000)
- All proxy blocks updated to work with HTTPS

### 3. Docker Compose Updates

- Added port `443:443` mapping for nginx
- SSL directory mounted into nginx container (`config/nginx/ssl:/etc/nginx/ssl:ro`)
- Nginx config references cert files from mounted path

### 4. Let's Encrypt Placeholder

Added documentation in nginx config showing where to add certbot integration for domain-based deployments:
```nginx
# For production with Let's Encrypt, replace the self-signed cert paths with:
# ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;
```

---

## Impact Assessment

| Metric | Before | After |
|---|---|---|
| Transport encryption | None (HTTP) | TLS 1.2/1.3 |
| Credential sniffing risk | High (plain text on LAN) | Eliminated |
| Browser trust | Full trust | Self-signed warning (expected) |
| Let's Encrypt ready | No | Yes (placeholder documented) |
| Ports exposed | 8088 (HTTP only) | 443 (HTTPS) + 8088 (redirects to HTTPS) |

---

## Testing

- `openssl s_client` connects and verifies TLS handshake
- Browser shows self-signed cert warning (expected for LAN)
- HTTP → HTTPS redirect works
- All 12 services proxy correctly over HTTPS
- WebSocket connections work over WSS

---

**Status:** ✅ Complete. PR #189 merged.
