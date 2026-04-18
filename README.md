<p align="center">
  <img src="https://img.shields.io/badge/Status-Pre--Release-orange?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/License-FSL--1.1%2FApache--2.0-blue?style=for-the-badge" alt="License" />
</p>

<p align="center">
  <h1 align="center">🏠 HomeForge (dhobs)</h1>
  <p align="center"><strong>The private, self-hosted digital hub & AI appliance.</strong></p>
</p>

---

## 🚀 1. Quick Start

### Option A: The "Boom" Script (Mac / Local)
Best for day-to-day restarts.
```bash
chmod +x boom.sh
./boom.sh
```

### Option B: The "Install" Script (Linux / First-Time)
Run once for fresh clones.
```bash
chmod +x install.sh
./install.sh
```

### Option C: Manual Setup
```bash
cp .env.example .env
# Edit .env, then:
docker compose up -d
```

---

## 🛠️ 2. Deep Clean (Fix Sequence)
If the UI is freezing, images aren't updating, or the stack is behaving weirdly, run this:

```bash
docker compose down
docker builder prune -af
docker image rm opensourcehomelabbing-dashboard:latest opensourcehomelabbing-homeforge-backup:latest 2>/dev/null || true
./boom.sh
```

---

## 🔄 3. Update & Rollback

### Safe Update
```bash
bash scripts/update.sh
```

### Rollback
```bash
bash scripts/rollback.sh
```

---

## 🔐 4. Security Setup

1. Open `http://localhost:3069`
2. Generate entropy key via mouse movement.
3. **⚠️ Save the key!** It encrypts your entire database.
4. Create your admin account.

---

## 📦 5. Services

| Service | Local Port |
|---|---|
| **Dashboard** | `:3069` |
| **Jellyfin** | `:8096` |
| **Nextcloud** | `:8081` |
| **Theia IDE** | `:3030` |
| **Element (Chat)**| `:8082` |
| **Vaultwarden** | `:8083` |
| **Open-WebUI** | `:8085` |

---

## 🛡️ 6. Security Features
- **HKDF-SHA512** derivation for all secrets.
- **SQLCipher** AES-256-GCM encrypted database.
- **Argon2id** password hashing.
- **Rate limiting** on all auth routes.

---

## 👥 Contributors
- [Basil Suhail](https://github.com/BasilSuhail)
- [Saad Shafique](https://github.com/saadsh15)
