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

1. Copy `.env.example` to `.env` and set real values (never commit `.env`).
2. Follow stack-specific instructions as they are added per package.

## Remote

```text
git@github.com:dhakerrhim/supfileDev.git
```
