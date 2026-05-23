# SUPFile

Plateforme de stockage cloud sécurisée — projet scolaire.

---

## Quick start

```bash
# 1. Clone
git clone git@github.com:dhakerrhim/supfileDev.git
cd supfileDev

# 2. Environment
cp server/.env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET at minimum

# 3. Run
docker compose up --build -d

# Web app → http://localhost:4000
# API     → http://localhost:3000
```

---

## Architecture

```
┌─────────────────┐     HTTP/REST      ┌─────────────────┐
│  client-web     │ ─────────────────► │  server          │
│  Next.js 14     │                    │  Express + Node  │
│  port 4000      │                    │  port 3000       │
└─────────────────┘                    └────────┬────────┘
                                                │
                              ┌─────────────────┴──────────────────┐
                              │  PostgreSQL 16    Docker Volume     │
                              │  port 5432        /app/storage      │
                              └────────────────────────────────────┘

┌─────────────────┐
│  mobile          │  React Native / Expo — same REST API
└─────────────────┘
```

---

## Features

- Email/password registration and login, Google OAuth2
- File upload, rename, move, download (single + ZIP folder)
- Inline preview: images, PDF, text, audio, video (Range streaming)
- Soft-delete trash with restore and permanent delete
- Public share links with optional password protection and expiry date
- Internal folder sharing between registered users (read / write permission)
- Search with autocomplete and filters (type, date)
- Dashboard: storage quota ring, file type breakdown donut chart, recent files
- Settings: profile, avatar upload/remove, password change, light/dark theme
- AES-256-CBC file encryption (optional, server-side)
- Mobile app (iOS + Android)

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `JWT_SECRET` | Yes | — | JWT signing secret (long random string) |
| `DB_NAME` | No | `supfile_dev` | Database name |
| `DB_USER` | No | `supfile` | PostgreSQL user |
| `DB_HOST` | No | `db` | PostgreSQL host (Docker service name) |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `PORT` | No | `3000` | Express listen port |
| `JWT_EXPIRES_IN` | No | `7d` | JWT lifetime |
| `OAUTH_CLIENT_ID` | No | — | Google OAuth2 client ID |
| `OAUTH_CLIENT_SECRET` | No | — | Google OAuth2 client secret |
| `OAUTH_CALLBACK_URL` | No | `http://localhost:3000/auth/oauth/callback` | OAuth2 callback URL |
| `STORAGE_PATH` | No | `./storage` | File storage path on disk |
| `CLIENT_ORIGIN` | No | `http://localhost:4000` | Allowed CORS origin |
| `ENCRYPTION_KEY` | No | — | 64 hex chars (32 bytes) for AES-256 encryption. Leave empty to disable. |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3000` | API URL used by the web client |

Generate an encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Project structure

```
supfileDev/
├── docker-compose.yml
├── docs/
│   ├── Documentation_Technique_SUPFile.md
│   └── Manuel_Utilisateur_SUPFile.md
├── server/                  # Express API (Node.js 20)
│   ├── Dockerfile
│   └── src/
│       ├── app.js
│       ├── controllers/
│       ├── db/schema.sql    # Single source of truth for the DB schema
│       ├── middleware/
│       ├── routes/
│       └── services/
├── client-web/              # Next.js 14 App Router
│   ├── Dockerfile
│   └── src/app/
├── mobile/                  # React Native + Expo Router
│   └── app/
└── shared/                  # Shared assets (logo, palette)
```

---

## Documentation

- [Documentation Technique](docs/Documentation_Technique_SUPFile.md) — installation, architecture, DB schema, API reference, security
- [Manuel Utilisateur](docs/Manuel_Utilisateur_SUPFile.md) — step-by-step user guide, FAQ

---

## Git workflow

- `main` — stable, production-ready (no direct pushes)
- `develop` — integration branch; base for feature branches
- `feat/<name>` — feature branches, merged into `develop` via Pull Request
- `hotfix/...` — urgent fixes from `main`, merged back into `main` and `develop`

Commit convention: `type(scope): short description`  
Examples: `feat(auth): add Google OAuth`, `fix(ui): dark mode in files modal`

---

## Team

| Name | Role |
|---|---|
| Mohamed-Adam Ata | Développeur fullstack |
| Adam Elrhoul | Développeur fullstack |
| Dhaker Rhimi | Développeur fullstack |
| Mouaad Sekkouri | Développeur fullstack |
