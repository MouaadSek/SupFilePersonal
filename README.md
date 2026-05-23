# SUPFile

Monorepo for the SUPFile project (backend, web, mobile).

## Git workflow

- **main** — stable, production-ready code only (no direct pushes).
- **develop** — continuous integration; base branch for features.
- **feat/prenom** — feature branches (e.g. `feat/dhaker`, `feat/mouadh`).
- **hotfix/...** — urgent fixes from `main`, merged back into `main` and `develop`.

Feature work merges into `develop` via Pull Request (at least one reviewer). Releases merge `develop` → `main`.

Commit messages follow: `type(scope): short description` (e.g. `feat(auth): add JWT login`).

 
## Local setup

1. Copy `.env.example` to `.env` at the repo root and set `DB_PASSWORD`, `JWT_SECRET`, etc.
2. **API** — `cd server && npm install && npm run dev` (port 3000), or `docker compose up` from the repo root.
3. **Web** — `cd client-web && npm install && npm run dev` (port 4000).
4. **Mobile** — `cd mobile && cp .env.example .env`, set `EXPO_PUBLIC_API_URL`, then `npm install && npx expo start`.

## Remote

```text
git@github.com:dhakerrhim/supfileDev.git
```
