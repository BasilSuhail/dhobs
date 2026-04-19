# Collabora frame-ancestors / HOMEFORGE_LAN_IP Mismatch Incident

**Date:** 2026-04-19
**Severity:** HIGH — Nextcloud Office completely broken
**Status:** RESOLVED
**Related:** Log 10.1 (HOMEFORGE_LAN_IP Incident), Log 17 (Collabora WOPI Postmortem)

---

## 1. The Symptom

Opening any `.docx`, `.odt`, or `.xlsx` in Nextcloud resulted in one of:
- Infinite spinner (browser couldn't reach Collabora)
- `frame-ancestors` CSP violation from Collabora
- `form-action` / `frame-src` CSP violation from Nextcloud
- "Document loading failed — Failed to load Nextcloud Office"
- 500 on `/apps/richdocuments/token`

---

## 2. Root Cause

**`HOMEFORGE_LAN_IP` was set to a LAN IP (`192.168.178.108`), but the user accesses Nextcloud from `localhost:8081`.**

Collabora builds its `Content-Security-Policy: frame-ancestors` header from `server_name` and `aliasgroup1`. With `server_name=192.168.178.108:9980`, the header becomes:

```
frame-ancestors 192.168.178.108:* nextcloud:*
```

`localhost` is NOT in this list. When the browser (at `localhost:8081`) tries to frame Collabora, the browser blocks it.

The correct value for single-machine access: `HOMEFORGE_LAN_IP=localhost`.

---

## 3. Chain of Issues Encountered

| # | Error | Cause | Fix Applied |
|---|-------|-------|-------------|
| 1 | CSP `frame-src` blocks `localhost:9980` | `server_name=localhost:9980` but `public_wopi_url=192.168.178.108:9980` — mismatch | Changed `server_name` to use `${HOMEFORGE_LAN_IP}` |
| 2 | 500 on `/apps/richdocuments/token` — `xpath() on false` | setup-office.sh deleted discovery cache file but didn't re-fetch | Fixed to curl-fetch discovery on startup with `chown www-data` |
| 3 | `richdocuments:activate-config` resets `wopi_callback_url` | occ command intentionally clears it to "autodetect" | Never run `richdocuments:activate-config` — it breaks Docker deployments |
| 4 | CLI `resetCache()` doesn't fix browser requests | CLI PHP and Apache PHP have **separate APCu instances** — CLI cache reset doesn't affect web server | Must restart/recreate Nextcloud container to clear Apache APCu |
| 5 | `docker compose restart` kept old `HOMEFORGE_LAN_IP` | `restart` freezes env vars from container creation time | Must use `docker compose up -d` to pick up `.env` changes |
| 6 | `frame-ancestors` blocks `localhost` | `HOMEFORGE_LAN_IP=10.130.44.16` → Collabora frame-ancestors excludes localhost | Set `HOMEFORGE_LAN_IP=localhost` |

---

## 4. The Fix

```bash
# In .env
HOMEFORGE_LAN_IP=localhost   # if accessing from the same machine only

# Recreate both containers (restart is NOT enough — env vars are baked in)
docker compose up -d nextcloud collabora
```

---

## 5. If This Happens Again

**Step 1 — Check which host the user is accessing from:**
- Accessing from the server itself (localhost)? → `HOMEFORGE_LAN_IP=localhost`
- Accessing from other devices on LAN? → `HOMEFORGE_LAN_IP=<actual LAN IP>`

Find LAN IP on Mac: `ipconfig getifaddr en0`

**Step 2 — Verify all three WOPI values are consistent:**
```bash
docker exec project-s-collabora printenv server_name
docker exec -u www-data project-s-nextcloud php /var/www/html/occ config:app:get richdocuments public_wopi_url
docker exec -u www-data project-s-nextcloud php /var/www/html/occ config:app:get richdocuments wopi_callback_url
```
- `server_name` and `public_wopi_url` must use the **same hostname**
- `wopi_callback_url` must be `http://nextcloud:80`

**Step 3 — After changing `.env`, RECREATE (not restart) containers:**
```bash
docker compose up -d nextcloud collabora
```

**Step 4 — Run diagnose to verify:**
```bash
./diagnose-office.sh
```

---

## 6. Key Rules

1. **`HOMEFORGE_LAN_IP=localhost`** for same-machine access. LAN IP only if accessing from other devices.
2. **Never run `occ richdocuments:activate-config`** — it resets `wopi_callback_url` to empty, breaking Docker callbacks.
3. **`docker compose restart` ≠ `docker compose up -d`** — restart keeps old env vars; only `up -d` picks up `.env` changes.
4. **CLI PHP APCu ≠ Apache PHP APCu** — resetting cache via `docker exec php -r` does NOT affect running web server cache.
5. **`wopi_callback_url=http://nextcloud:80`** must always be set — without it Collabora can't fetch files (uses browser-derived URL which is unreachable from inside container).

---

## 7. Files Changed This Session

| File | Change |
|------|--------|
| `docker-compose.yml` | `server_name` now uses `${HOMEFORGE_LAN_IP:-localhost}:9980` |
| `config/nextcloud/setup-office.sh` | Curl-fetches discovery XML on every start; adds `chown www-data`; does NOT call `richdocuments:activate-config` |
| `.env` | `HOMEFORGE_LAN_IP=localhost` |
