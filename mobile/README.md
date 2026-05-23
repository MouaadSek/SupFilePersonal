# SUPFILE (Expo mobile app)

Cloud storage client for the SUPFile API.

## Prerequisites

- Node.js 20+
- [Expo](https://docs.expo.dev/) (`npx expo`)
- SUPFile API running (see backend below)

## Backend API

The API lives in a separate clone (e.g. `~/server` next to this repo).

```bash
cd ~/server
cp .env.example .env
# Edit .env: DB_PASSWORD, JWT_SECRET (required)

npm install
npm run dev
```

Or with Docker (from `server/`, ensure parent paths exist or adjust compose):

```bash
export DB_PASSWORD=yourpassword JWT_SECRET=your-long-secret
docker compose up --build
```

API listens on **port 3000**. Check: `curl http://localhost:3000/health`

## Connect the app to the API

1. Copy env: `cp .env.example .env`
2. Set `EXPO_PUBLIC_API_URL` to the machine running the API:
   - iOS simulator / web: `http://localhost:3000`
   - Android emulator: `http://10.0.2.2:3000`
   - Physical device: `http://<your-pc-lan-ip>:3000` (same Wi‑Fi as the phone)
3. Restart Expo after changing env (`npx expo start -c`)

## Run the app

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (device) or press `a` / `i` for emulator.

## Auth

Register or log in in the app. The API returns a JWT; the app stores it and sends `Authorization: Bearer <token>` on protected routes.

## Features wired to the API

| Screen | API |
|--------|-----|
| Login / Register | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Home | `GET /dashboard/quota`, `/recent`, `/breakdown` |
| Files | `GET/POST/PATCH/DELETE /folders`, `POST /files/upload`, `GET /search` |
| Trash | `GET /files/trash`, restore, permanent delete, empty |
| Shares | `GET/POST/DELETE /shares`, `GET /shares/with-me`, folder members |
| Profile | `PUT /users/me`, password, avatar |
| Preview | `GET /files/:id`, preview, download |

Pull-to-refresh on Files and focus refresh on Files/Shares reload data from the API.
