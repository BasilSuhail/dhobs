# Collabora WOPI Integration — Root Cause Analysis & Postmortem

**Date:** 2026-03-29
**Severity:** CRITICAL — document editing completely broken
**Duration:** ~8 hours across 7 PRs (#17-#23)
**Status:** RESOLVED (PR #23)

---

## 1. The Symptom

Opening any document in Nextcloud Office (Collabora) resulted in:
- Infinite loading spinner in the browser
- "Document loading failed — Unauthorized WOPI host" error message
- Browser console: `POST /apps/richdocuments/token → 500`

---

## 2. The Root Cause

**Collabora could not reach Nextcloud to fetch the document.**

When a user opens a document, this is the WOPI flow:

```
  STEP 1: User clicks document in Nextcloud (http://localhost:8081)
             │
  STEP 2: Nextcloud generates an editor URL and sends it to the browser:
             │   URL contains WOPISrc=http://localhost:8081/apps/richdocuments/wopi/files/123
             │
  STEP 3: Browser opens iframe to Collabora (http://localhost:9980/cool/...)
             │   passing the WOPISrc parameter
             │
  STEP 4: Collabora receives WOPISrc and makes an HTTP callback:
             │   GET http://localhost:8081/apps/richdocuments/wopi/files/123
             │        ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
             │        THIS IS THE PROBLEM
             │
  STEP 5: Inside the Collabora container:
             "localhost" = 127.0.0.1 = the container ITSELF
             Port 8081 is NOT running inside Collabora
             → Connection refused → 0 (Unknown) → FAILURE
```

The WOPISrc URL contains `localhost:8081` because Nextcloud's `OVERWRITEHOST` is set to `localhost:8081`. The browser sees this as correct (it can reach `localhost:8081`). But Collabora is inside a Docker container where `localhost` means itself, not the host machine.

**Collabora's source code (wsd/wopi/CheckFileInfo.cpp) uses the WOPISrc URL AS-IS for HTTP callbacks. It does NOT rewrite the hostname to the canonical alias. The `alias_groups` feature only validates and deduplicates — it never rewrites callback URLs.**

---

## 3. The Fix

One Nextcloud `occ` command:

```bash
php occ config:app:set richdocuments wopi_callback_url \
    --value="http://nextcloud:80"
```

This setting (introduced in richdocuments PR #3315, Dec 2023, requires v8.0+) tells the richdocuments app to override the browser-derived WOPISrc hostname with a Docker-internal URL for all Collabora→Nextcloud WOPI callbacks.

**Before fix:**
```
Collabora → GET http://localhost:8081/wopi/files/123 → FAIL (localhost = itself)
```

**After fix:**
```
Collabora → GET http://nextcloud:80/wopi/files/123 → SUCCESS (Docker DNS)
```

The setting is applied in three places for redundancy:
1. `config/nextcloud/setup-office.sh` — runs on every container start
2. `config/nextcloud/setup-office-post-install.sh` — runs on first install
3. `install.sh` — force-configured from the host after Nextcloud is ready

---

## 4. What We Tried (and Why Each Failed)

| PR | Attempt | Why It Failed |
|----|---------|--------------|
| #17 | `depends_on: collabora: service_healthy` (startup ordering) | Ordering was fine; the callback URL was the real issue |
| #18 | Added `localhost:8081` to `aliasgroup1` | `aliasgroup1` only validates WOPISrc hosts, does NOT rewrite the callback URL |
| #19 | Propagated `HOMEFORGE_LAN_IP` to `OVERWRITEHOST` + `aliasgroup1` | Correct for LAN access, but localhost callback still failed |
| #20 | Added `--o:storage.wopi.host[0]=localhost` to `extra_params` | Only controls the WOPI allowlist, not callback destinations. Also: brackets in YAML may get mangled |
| #21 | Added `localhost:host-gateway` to `extra_hosts` | Made localhost resolve to host gateway — WOPI worked BUT broke container healthchecks and loopback |
| #22 | Changed healthcheck to use `127.0.0.1` | Workaround for #21's breakage, still a fragile hack |
| **#23** | **`wopi_callback_url=http://nextcloud:80`** | **THE FIX. Overrides the callback URL at the richdocuments layer. No container networking hacks needed.** |

---

## 5. Key Lessons

### 5.1 Read the actual error, not the browser message
The browser showed "Unauthorized WOPI host" which led us down the aliasgroup rabbit hole. The actual Collabora server log said:

```
WOPI::CheckFileInfo failed for URI [http://localhost:8081/...]: 0 (Unknown). Headers: Body: []
```

`0 (Unknown)` with empty response = **connection refused**, NOT authorization failure. The browser error message was misleading.

### 5.2 Collabora alias_groups does NOT rewrite URLs
From the Collabora source code (`wsd/Storage.cpp`, `wsd/HostUtil.cpp`):
- `alias_groups` validates that the WOPISrc hostname is allowed
- `HostUtil::getNewUri()` rewrites the URL, but ONLY for `docKey` (document deduplication)
- `CheckFileInfo` uses the ORIGINAL `uriPublic` for the actual HTTP request

### 5.3 Docker networking: "localhost" means different things
```
From the browser:  localhost = the host machine (correct)
From a container:  localhost = 127.0.0.1 = the container itself (different!)
```

This is the fundamental challenge of running services on a Docker bridge network. Any URL containing `localhost` that crosses a container boundary will fail.

### 5.4 The diagnostic script was essential
`diagnose-office.sh` (added in PR #20) provided the Collabora server-side logs that revealed the real error. Without it, we were guessing based on browser-side symptoms.

### 5.5 `wopi_callback_url` is the canonical solution
This setting was added to richdocuments specifically for Docker deployments. It exists because the Collabora/Nextcloud team recognized that WOPISrc URLs from the browser are often unreachable from inside containers.

---

## 6. Final Configuration (PR #23)

### Three WOPI URLs (each serves a different actor)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  wopi_url = http://collabora:9980                                  │
│  ─────────────────────────────────                                 │
│  Direction: Nextcloud → Collabora                                  │
│  Purpose:   Fetch WOPI discovery XML, get editor capabilities      │
│  Network:   Docker bridge (container-to-container)                 │
│                                                                     │
│  wopi_callback_url = http://nextcloud:80                           │
│  ────────────────────────────────────────                           │
│  Direction: Collabora → Nextcloud                                  │
│  Purpose:   CheckFileInfo, GetFile, PutFile (fetch/save documents) │
│  Network:   Docker bridge (container-to-container)                 │
│  KEY:       Overrides the browser-derived WOPISrc hostname         │
│                                                                     │
│  public_wopi_url = http://<LAN_IP>:9980                            │
│  ──────────────────────────────────────                             │
│  Direction: Browser → Collabora                                    │
│  Purpose:   Load the document editor iframe                        │
│  Network:   Host network (browser to published Docker port)        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### docker-compose.yml (Collabora section — final)

```yaml
collabora:
  image: collabora/code:24.04.10.2.1
  ports:
    - '9980:9980'
  extra_hosts:
    - "host.docker.internal:host-gateway"
    # NO "localhost:host-gateway" — that breaks container loopback
  environment:
    - aliasgroup1=http://nextcloud:80
    - server_name=localhost:9980
    - extra_params=--o:ssl.enable=false --o:ssl.termination=false
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9980/"]
    # Can use localhost normally — no extra_hosts override
```

---

## 7. Timeline

| Time | Action | Result |
|------|--------|--------|
| 11:22 | Initial clone + audit begins | 28 issues found |
| 12:15 | PR #1 merged — moved Collabora to bridge network | WOPI broke (but wasn't tested) |
| 14:57 | PR #17 — startup ordering fix | Still broken |
| 15:01 | PR #18 — aliasgroup1 fix | Still broken |
| 15:30 | PR #19 — LAN IP propagation | Still broken |
| 16:00 | PR #20 — diagnostic tool created | REVEALED real error in logs |
| 16:30 | PR #21 — localhost:host-gateway | Worked but broke healthchecks |
| 16:45 | PR #22 — healthcheck workaround | Fragile, still broken for user |
| 17:00 | Deep research: Collabora source code analysis | Found: alias_groups doesn't rewrite |
| 17:30 | Deep research: richdocuments PR #3315 | Found: wopi_callback_url exists |
| 18:00 | **PR #23 — wopi_callback_url=http://nextcloud:80** | **FIXED** |

---

## 8. Prevention

To prevent this class of issue in the future:

1. **Always test document editing after any Docker networking change** — WOPI is the most fragile integration in the stack
2. **Read container logs, not browser errors** — browser-side messages are often misleading
3. **Use `diagnose-office.sh`** before and after changes to verify the WOPI flow
4. **Never remap `localhost` in `extra_hosts`** — it breaks the container's own services
5. **Use `wopi_callback_url` in any Docker bridge deployment** — it exists specifically for this purpose

---

## 9. Credits

- **richdocuments PR #3315** by Julius Knorr (Nextcloud) — introduced `wopi_callback_url`
- **diagnose-office.sh** — the diagnostic tool that finally revealed the real error
- **Collabora Online source code** (`wsd/wopi/CheckFileInfo.cpp`, `wsd/HostUtil.cpp`) — confirmed alias_groups does NOT rewrite callback URLs
