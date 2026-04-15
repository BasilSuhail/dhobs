# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` (pre-alpha) | ✅ Yes |
| Earlier releases | ❌ No |

---

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in HomeForge, please report it **privately** so we can investigate and fix it before public disclosure.

### How to Report

**Option 1: GitHub Security Advisory (Recommended)**

Go to the **Security** tab of this repository and click **Report a vulnerability**. This creates a private discussion visible only to maintainers.

**Option 2: Email**

If you prefer email, use the contact form on the GitHub profile of:

- **Basil Suhail** — github.com/BasilSuhail
- **Saad Shafique** — github.com/saadsh15

### What to Include

1. **Description** — Clear explanation of the vulnerability
2. **Steps to Reproduce** — Specific commands, configs, or actions that trigger it
3. **Affected Component** — Which service, API route, or dependency is impacted
4. **Severity** — Your assessment (Low / Medium / High / Critical)
5. **Proof of Concept** — Code, screenshots, or logs (if applicable)

### What to Expect

| Stage | Timeline |
|---|---|
| Acknowledgment | Within 72 hours |
| Initial investigation | Within 1 week |
| Fix deployed | Within 4 weeks (depending on severity) |
| Public disclosure | After fix is released, or 90 days — whichever comes first |

We will keep you informed of our progress. You are welcome to request an update at any time.

---

## Scope

### In Scope

- Authentication system (entropy key, session management, RBAC)
- SQLCipher database encryption
- WebSocket terminal security (ticket auth, PTY isolation)
- Docker container security (volume mounts, privileged mode usage)
- Dependency vulnerabilities (Dependabot alerts)
- API route access controls

### Out of Scope

- Third-party services bundled with HomeForge (Jellyfin, Nextcloud, Matrix, etc.) — report to upstream maintainers
- Vulnerabilities requiring physical access to the host machine
- Social engineering attacks
- Denial of service via resource exhaustion (rate limiting is in place)

---

## Safe Harbor

We will not pursue legal action against security researchers who:

- Follow this policy in good faith
- Do not access, modify, or delete user data
- Do not disrupt services for other users
- Report the vulnerability promptly and privately

---

## Known Issues

- OpenVPN container fails to start on Docker Desktop for Mac due to iptables/`eth0` incompatibility — documented in Log 25
- This is a known limitation, not a security vulnerability

---

*Last updated: April 10, 2026*
