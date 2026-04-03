# Nextcloud Office — HOMEFORGE_LAN_IP Mismatch Incident

**Date:** 2026-04-03
**Severity:** HIGH — Nextcloud Office completely broken (Word/Writer/Calc files fail to open)
**Status:** RESOLVED (PR #60)
**Related:** Log 17 — Collabora WOPI Postmortem (first Collabora incident)

---

## 1. The Symptom

- Clicking any `.docx`, `.odt`, or `.xlsx` file in Nextcloud opened a blank/loading screen
- No error message in the browser — the editor simply never loaded
- `POST /apps/richdocuments/token` returned HTTP 200 (token generation was fine)
- Collabora container was healthy and running normally

---

## 2. Root Cause

**`HOMEFORGE_LAN_IP=localhost` in `.env` caused a split between where Nextcloud told the browser to find Collabora and where Collabora thought it was.**

### The WOPI Flow (simplified)

```
User clicks file in Nextcloud
        │
Nextcloud generates editor URL using public_wopi_url
        │   → http://<public_wopi_url>/browser/...?WOPISrc=...
        │
Browser loads that URL directly
        │
Collabora serves the editor, validates against server_name
        │
Collabora fetches file from Nextcloud via wopi_callback_url (Docker-internal)
```

### What broke

`.env.example` was updated in PR #54 to default `HOMEFORGE_LAN_IP=localhost` (previously empty). When `.env` was regenerated with `cp .env.example .env`, the value became `localhost`.

This caused two misaligned values:

| Setting | Value | Where set |
|---|---|---|
| `public_wopi_url` | `http://localhost:9980` | `setup-office.sh` using `${HOMEFORGE_LAN_IP:-localhost}` |
| Collabora `server_name` | `192.168.178.108:9980` | `docker-compose.yml` with fallback `${HOMEFORGE_LAN_IP:-192.168.178.108}` |

The fallback in `docker-compose.yml` was a **hardcoded Mac IP** (`192.168.178.108`) instead of `localhost`, so when `HOMEFORGE_LAN_IP=localhost`, these two values diverged.

**Result:** The browser was told to load Collabora at `http://localhost:9980`. On any device other than the server itself, `localhost` points to the user's own machine — which has no Collabora. The editor silently failed to load.

### Secondary issue: `fix-office.sh` hardcoded `localhost`

`fix-office.sh` (added in PR #53) always set `public_wopi_url=http://localhost:9980` regardless of `HOMEFORGE_LAN_IP`. If run manually while `HOMEFORGE_LAN_IP` was a real LAN IP, it would re-introduce the mismatch in reverse.

### Third issue: dashboard build failure

`components/metrics/system-chart.tsx` line 1 had a stray `w` character: `w"use client"`. This caused a Turbopack parse error that failed the entire dashboard Docker build, preventing `./boom.sh` from completing.

### Critical: the CSP is generated from `public_wopi_url`

Nextcloud's `richdocuments` app generates a `Content-Security-Policy` header on every page load that explicitly whitelists the `public_wopi_url` value for `frame-src` and `form-action`. If `public_wopi_url=http://localhost:9980`, the CSP reads:

```
frame-src 'self' nc: http://localhost:9980
form-action 'self' http://localhost:9980
```

Any attempt to load Collabora from a different hostname (e.g. `192.168.178.108:9980`) is **blocked by the browser** with a CSP violation — even if the container is healthy and the WOPI URLs look correct.

`setup-office.sh` runs as a `before-starting` hook on **every Nextcloud container start**. This means manually fixing `public_wopi_url` via `occ` is overwritten the next time Nextcloud restarts. The only reliable fix is ensuring `HOMEFORGE_LAN_IP` is correct in `.env` **before** containers start.

---

## 3. The Fix (PR #60)

**`docker-compose.yml`** — Changed Collabora `server_name` fallback:
```yaml
# Before
- server_name=${HOMEFORGE_LAN_IP:-192.168.178.108}:9980

# After
- server_name=${HOMEFORGE_LAN_IP:-localhost}:9980
```

**`fix-office.sh`** — Reads `HOMEFORGE_LAN_IP` from the live Nextcloud container:
```bash
PUBLIC_HOST=$(docker exec project-s-nextcloud printenv HOMEFORGE_LAN_IP 2>/dev/null)
PUBLIC_HOST="${PUBLIC_HOST:-localhost}"
```

**`system-chart.tsx`** — Removed stray `w` on line 1.

---

## 4. If This Happens Again

**Symptom:** Clicking a document in Nextcloud results in a loading screen that never resolves.

**Step 1 — Verify the WOPI URLs are consistent:**
```bash
docker exec -u www-data project-s-nextcloud php /var/www/html/occ config:app:get richdocuments public_wopi_url
docker exec project-s-collabora printenv server_name
```
Both should use the same hostname (either both `localhost` or both your LAN IP).

**Step 2 — Check `HOMEFORGE_LAN_IP` in `.env`:**
```bash
grep HOMEFORGE_LAN_IP .env
```
- If accessing HomeForge from **the same machine only**: `localhost` is fine
- If accessing from **other devices on the network**: must be your machine's LAN IP (e.g. `192.168.178.108`)

Find your LAN IP on Mac:
```bash
ipconfig getifaddr en0
```

**Step 3 — Fix `.env` then recreate both Nextcloud and Collabora:**
```bash
# Fix the IP in .env first
python3 -c "
import re
with open('.env', 'r') as f: content = f.read()
content = re.sub(r'^HOMEFORGE_LAN_IP=.*', 'HOMEFORGE_LAN_IP=$(ipconfig getifaddr en0)', content, flags=re.MULTILINE)
with open('.env', 'w') as f: f.write(content)
"

# Recreate both containers so setup-office.sh re-runs with the correct IP
docker compose up -d nextcloud collabora
```

> **Critical:** You must recreate **Nextcloud** (not just Collabora) — `setup-office.sh` runs on every Nextcloud start and sets the CSP-generating `public_wopi_url`. Manually patching via `occ` is overwritten on the next restart.
>
> `docker compose restart` does NOT pick up `.env` changes. Always use `docker compose up -d` to recreate.

---

## 5. Key Rules Going Forward

1. **All hostname fallbacks in `docker-compose.yml` must use `localhost`**, not a hardcoded IP. The only place a real IP belongs is in `.env`.
2. **`fix-office.sh` must never hardcode `localhost`** — it should always read `HOMEFORGE_LAN_IP` from the live container.
3. **After changing `.env`, use `docker compose up -d <service>`** (not `restart`) to apply env changes to a running container.
4. **Do not run `cp .env.example .env` manually.** Both `boom.sh` and `install.sh` create `.env` automatically on first run and detect your LAN IP. Running the copy command manually resets all your values and bypasses auto-detection.
