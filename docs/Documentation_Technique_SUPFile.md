# Documentation Technique — SUPFile

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Architecture générale](#2-architecture-générale)
3. [Installation et déploiement](#3-installation-et-déploiement)
4. [Justification des choix technologiques](#4-justification-des-choix-technologiques)
5. [Schéma de base de données](#5-schéma-de-base-de-données)
6. [Diagramme des cas d'utilisation](#6-diagramme-des-cas-dutilisation)
7. [Référence API](#7-référence-api)
8. [Sécurité](#8-sécurité)
9. [Structure du projet](#9-structure-du-projet)

---

## 1. Présentation du projet

SUPFile est une plateforme de stockage cloud sécurisée conçue dans le cadre d'un projet scolaire. Elle permet aux utilisateurs de déposer, organiser, prévisualiser et partager des fichiers depuis un navigateur web ou une application mobile.

**Fonctionnalités principales**

- Authentification locale (email + mot de passe) et OAuth2 Google
- Gestion de fichiers et de dossiers (upload, renommage, déplacement, corbeille)
- Prévisualisation en ligne : images, PDF, texte, audio, vidéo
- Téléchargement individuel ou en archive ZIP
- Partage public par lien (optionnellement protégé par mot de passe et/ou date d'expiration)
- Partage interne de dossiers entre utilisateurs enregistrés (permissions `read` / `write`)
- Recherche avec autocomplétion et filtres (type MIME, date)
- Tableau de bord : quota, fichiers récents, répartition par type
- Paramètres : profil, avatar, mot de passe, thème (clair / sombre)
- Application mobile React Native / Expo

---

## 2. Architecture générale

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                        │
│              Next.js 14  ·  Tailwind CSS  ·  Axios              │
│                         port 4000                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼──────────────────────────────────────┐
│                       API Server                                │
│              Express 4  ·  Node.js 20  ·  Passport              │
│                         port 3000                               │
│   ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│   │  Auth routes │  │  File routes  │  │  Share routes    │    │
│   │  Folder rts  │  │  Dashboard rts│  │  User routes     │    │
│   └──────────────┘  └───────────────┘  └──────────────────┘    │
│              │                    │                             │
│   ┌──────────▼──────┐   ┌────────▼──────────────────┐         │
│   │   PostgreSQL 16 │   │   Docker Volume (storage) │         │
│   │   port 5432     │   │   /app/storage            │         │
│   └─────────────────┘   └───────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Mobile (React Native / Expo)                  │
│                  EXPO_PUBLIC_API_URL → port 3000                 │
└─────────────────────────────────────────────────────────────────┘
```

Les trois services (`db`, `server`, `web`) sont orchestrés par Docker Compose. Le service `server` attend la santé de `db` avant de démarrer (`condition: service_healthy`).

---

## 3. Installation et déploiement

### Prérequis

- Docker Desktop ≥ 24 et Docker Compose v2
- Node.js ≥ 20 (pour le développement local sans Docker)

### Déploiement avec Docker Compose (recommandé)

```bash
# 1. Cloner le dépôt
git clone git@github.com:dhakerrhim/supfileDev.git
cd supfileDev

# 2. Créer le fichier d'environnement
cp server/.env.example .env
# Éditer .env et renseigner au minimum DB_PASSWORD et JWT_SECRET

# 3. Démarrer tous les services
docker compose up --build -d

# 4. Vérifier le démarrage
docker compose ps
curl http://localhost:3000/health   # → {"status":"ok"}
```

L'application web est accessible sur `http://localhost:4000`.

### Développement local (sans Docker)

**Backend**

```bash
cd server
cp .env.example .env      # renseigner DB_* pour une instance Postgres locale
npm install
npm run dev               # nodemon — port 3000
```

**Frontend web**

```bash
cd client-web
cp .env.example .env      # NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev               # Next.js — port 4000
```

**Application mobile**

```bash
cd mobile
cp .env.example .env      # EXPO_PUBLIC_API_URL=http://<IP>:3000
npm install
npx expo start
```

### Variables d'environnement

| Variable | Obligatoire | Valeur par défaut | Description |
|---|---|---|---|
| `DB_PASSWORD` | Oui | — | Mot de passe PostgreSQL |
| `JWT_SECRET` | Oui | — | Clé de signature JWT (chaîne longue aléatoire) |
| `DB_NAME` | Non | `supfile_dev` | Nom de la base de données |
| `DB_USER` | Non | `supfile` | Utilisateur PostgreSQL |
| `DB_HOST` | Non | `db` | Hôte PostgreSQL (service Docker) |
| `DB_PORT` | Non | `5432` | Port PostgreSQL |
| `PORT` | Non | `3000` | Port d'écoute du serveur Express |
| `JWT_EXPIRES_IN` | Non | `7d` | Durée de validité du JWT |
| `OAUTH_CLIENT_ID` | Non | — | Client ID Google OAuth2 |
| `OAUTH_CLIENT_SECRET` | Non | — | Secret Google OAuth2 |
| `OAUTH_CALLBACK_URL` | Non | `http://localhost:3000/auth/oauth/callback` | URL de callback OAuth2 |
| `STORAGE_PATH` | Non | `./storage` | Chemin de stockage des fichiers sur disque |
| `CLIENT_ORIGIN` | Non | `http://localhost:4000` | Origine autorisée pour CORS |
| `ENCRYPTION_KEY` | Non | — | Clé AES-256 en hexadécimal (64 chars). Si vide, chiffrement désactivé |
| `NEXT_PUBLIC_API_URL` | Non | `http://localhost:3000` | URL de l'API depuis le client web |

### Initialisation de la base de données

Le schéma SQL est appliqué automatiquement au démarrage du serveur (via `migrate()` dans `src/app.js`). En mode Docker Compose, le fichier `server/src/db/schema.sql` est également monté dans `/docker-entrypoint-initdb.d/` pour initialiser le conteneur PostgreSQL dès le premier démarrage.

---

## 4. Justification des choix technologiques

### Backend — Node.js + Express

Express est un framework léger et bien documenté, idéal pour un projet scolaire où l'équipe est de taille réduite. Son écosystème npm (multer, bcrypt, jsonwebtoken, passport) couvre tous les besoins sans surcharge. Node.js garantit une bonne performance en I/O pour les opérations de streaming de fichiers.

### Base de données — PostgreSQL 16

PostgreSQL offre les transactions ACID, les UUID natifs (via `pgcrypto`), les triggers `updated_at`, les index GIN pour la recherche plein texte et les requêtes récursives (CTE) pour la suppression de sous-arborescences de dossiers. Ces fonctionnalités auraient nécessité du code applicatif supplémentaire avec une base NoSQL.

### Frontend web — Next.js 14 (App Router)

Next.js permet de mélanger pages statiques et dynamiques dans le même projet. L'App Router simplifie la gestion des layouts imbriqués (layout racine → layout dashboard). Le bundle produit est optimisé pour la production via `npm run build`. Le mode `standalone` réduit l'image Docker à l'essentiel.

### Styling — Tailwind CSS

Tailwind impose une discipline de design system sans fichier CSS à maintenir. Les classes utilitaires sont purgées en production ; la taille finale du CSS est minimale. L'intégration dark mode (variant `dark:`) est native.

### Application mobile — React Native + Expo

Expo Router (file-based routing) et le SDK Expo simplifient le développement cross-platform (iOS / Android) depuis une base TypeScript partagée avec le frontend web. L'API REST existante est réutilisée sans modification.

### Authentification — JWT + OAuth2 Google

Les JSON Web Tokens sont sans état (stateless) : le serveur n'a pas besoin de stocker les sessions. La bibliothèque `passport-google-oauth20` gère le flux OAuth2. La fusion automatique d'un compte email existant avec un compte Google évite les doublons.

### Chiffrement optionnel — AES-256-CBC

Si `ENCRYPTION_KEY` est défini, les fichiers sont chiffrés à l'écriture et déchiffrés à la lecture via des streams Node.js. L'IV de 16 octets est préfixé au fichier sur disque. Le chiffrement est transparent pour l'utilisateur.

### Conteneurisation — Docker Compose

Docker Compose garantit la reproductibilité de l'environnement entre les machines des développeurs et la production. Les volumes nommés (`pg_data`, `file_storage`) persistent les données entre les redémarrages. La dépendance `service_healthy` garantit que le serveur ne démarre qu'une fois PostgreSQL prêt.

---

## 5. Schéma de base de données

Le schéma est défini dans `server/src/db/schema.sql`.

### Table `users`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `email` | TEXT | NOT NULL, UNIQUE | Adresse email (lowercase) |
| `password_hash` | TEXT | NULL si OAuth uniquement | Hash bcrypt (cost 12) |
| `display_name` | TEXT | NOT NULL, DEFAULT '' | Nom affiché |
| `avatar_url` | TEXT | — | Chemin relatif `/avatars/<filename>` |
| `quota_used` | BIGINT | NOT NULL, DEFAULT 0 | Octets utilisés |
| `quota_total` | BIGINT | NOT NULL, DEFAULT 32212254720 | Quota total (30 Go par défaut) |
| `oauth_provider` | TEXT | — | `'google'` ou NULL |
| `oauth_id` | TEXT | — | ID fournisseur OAuth |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Mis à jour automatiquement via trigger |

Contrainte unique composite : `(oauth_provider, oauth_id)`.

---

### Table `folders`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `name` | TEXT | NOT NULL | Nom du dossier |
| `parent_id` | UUID | FK → folders(id) ON DELETE CASCADE, NULL = racine | Dossier parent |
| `owner_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Propriétaire |
| `trashed` | BOOLEAN | NOT NULL, DEFAULT FALSE | En corbeille |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Mis à jour automatiquement |

Index : `idx_folders_owner (owner_id)`, `idx_folders_parent (parent_id)`, `idx_folders_name_fts` (GIN fulltext).

---

### Table `files`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `name` | TEXT | NOT NULL | Nom original du fichier |
| `folder_id` | UUID | FK → folders(id) ON DELETE SET NULL, NULL = racine | Dossier contenant |
| `owner_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Propriétaire |
| `mime_type` | TEXT | NOT NULL | Type MIME (`image/png`, `application/pdf`, …) |
| `size` | BIGINT | NOT NULL, DEFAULT 0 | Taille en octets |
| `storage_path` | TEXT | NOT NULL | Chemin absolu sur le volume Docker |
| `encrypted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Fichier chiffré AES-256-CBC |
| `trashed` | BOOLEAN | NOT NULL, DEFAULT FALSE | En corbeille |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Date de création |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Mis à jour automatiquement |

Index : `idx_files_owner`, `idx_files_folder`, `idx_files_trashed`, `idx_files_name_fts` (GIN fulltext).

---

### Table `shares`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Identifiant unique |
| `token` | TEXT | NOT NULL, UNIQUE | Jeton URL-safe (24 octets base64url) |
| `file_id` | UUID | FK → files(id) ON DELETE CASCADE, nullable | Fichier partagé |
| `folder_id` | UUID | FK → folders(id) ON DELETE CASCADE, nullable | Dossier partagé |
| `owner_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Créateur du lien |
| `password_hash` | TEXT | NULL = lien public | Hash bcrypt du mot de passe |
| `expires_at` | TIMESTAMPTZ | NULL = pas d'expiration | Date d'expiration |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Date de création |

Contrainte CHECK : exactement un des deux (`file_id`, `folder_id`) doit être non nul.  
Index : `idx_shares_token`, `idx_shares_owner`.

---

### Table `folder_members`

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `folder_id` | UUID | NOT NULL, FK → folders(id) ON DELETE CASCADE | Dossier partagé |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Utilisateur membre |
| `permission` | TEXT | NOT NULL, DEFAULT 'read', CHECK IN ('read','write') | Niveau de permission |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Date d'ajout |

Clé primaire composite : `(folder_id, user_id)`.

---

### Triggers automatiques

Un trigger `BEFORE UPDATE` sur les tables `users`, `folders` et `files` appelle la fonction `set_updated_at()` pour mettre à jour le champ `updated_at` à chaque modification.

---

## 6. Diagramme des cas d'utilisation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Système SUPFile                            │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Authentification                                                │   │
│  │    (UC1)  S'inscrire par email/mot de passe                     │   │
│  │    (UC2)  Se connecter par email/mot de passe                   │   │
│  │    (UC3)  Se connecter via Google (OAuth2)                      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Gestion des fichiers    [Utilisateur authentifié]              │   │
│  │    (UC4)  Uploader un fichier                                   │   │
│  │    (UC5)  Renommer un fichier                                   │   │
│  │    (UC6)  Déplacer un fichier vers un dossier                   │   │
│  │    (UC7)  Mettre un fichier en corbeille                        │   │
│  │    (UC8)  Restaurer un fichier depuis la corbeille              │   │
│  │    (UC9)  Supprimer définitivement un fichier                   │   │
│  │    (UC10) Vider la corbeille                                    │   │
│  │    (UC11) Télécharger un fichier                                │   │
│  │    (UC12) Prévisualiser un fichier (image/PDF/texte/audio/vidéo)│   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Gestion des dossiers    [Utilisateur authentifié]              │   │
│  │    (UC13) Créer un dossier                                      │   │
│  │    (UC14) Renommer un dossier                                   │   │
│  │    (UC15) Mettre un dossier en corbeille (récursif)             │   │
│  │    (UC16) Restaurer un dossier                                  │   │
│  │    (UC17) Télécharger un dossier en ZIP                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Partage                 [Utilisateur authentifié]              │   │
│  │    (UC18) Créer un lien de partage public (fichier ou dossier)  │   │
│  │    (UC19) Protéger un lien par mot de passe                     │   │
│  │    (UC20) Définir une date d'expiration sur un lien             │   │
│  │    (UC21) Révoquer un lien de partage                           │   │
│  │    (UC22) Partager un dossier avec un utilisateur enregistré    │   │
│  │    (UC23) Retirer un utilisateur d'un dossier partagé           │   │
│  │    (UC24) Quitter un dossier partagé par un autre utilisateur   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Accès public (anonyme ou authentifié)                          │   │
│  │    (UC25) Accéder à un lien de partage                          │   │
│  │    (UC26) Saisir le mot de passe d'un lien protégé              │   │
│  │    (UC27) Télécharger via un lien de partage                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Recherche & Tableau de bord  [Utilisateur authentifié]         │   │
│  │    (UC28) Rechercher par nom, type et date                      │   │
│  │    (UC29) Consulter le quota de stockage                        │   │
│  │    (UC30) Consulter les fichiers récents                        │   │
│  │    (UC31) Consulter la répartition par type de fichier          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Paramètres              [Utilisateur authentifié]              │   │
│  │    (UC32) Modifier le profil (nom, email)                       │   │
│  │    (UC33) Changer le mot de passe                               │   │
│  │    (UC34) Uploader / supprimer un avatar                        │   │
│  │    (UC35) Basculer thème clair/sombre                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

Acteurs :
  [Utilisateur anonyme]     → UC25, UC26, UC27
  [Utilisateur authentifié] → tous les autres UC
```

---

## 7. Référence API

L'API REST écoute sur le port **3000**. Toutes les routes protégées requièrent un header `Authorization: Bearer <JWT>`. Les réponses sont au format JSON.

### 7.1 Authentification — `/auth`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Non | Créer un compte |
| POST | `/auth/login` | Non | Se connecter |
| GET | `/auth/me` | Oui | Profil de l'utilisateur connecté |
| GET | `/auth/oauth/google` | Non | Initier le flux OAuth2 Google |
| GET | `/auth/oauth/google/callback` | Non | Callback OAuth2 Google |

**POST /auth/register**

Corps :
```json
{
  "email": "alice@example.com",
  "password": "motdepasse123",
  "display_name": "Alice"
}
```

Réponse `201` :
```json
{
  "token": "<JWT>",
  "user": { "id": "...", "email": "...", "display_name": "...", "quota_used": 0, "quota_total": 32212254720 }
}
```

Erreurs : `409 Email already in use`, `422 Validation errors`, `429 Too many attempts`.

---

**POST /auth/login**

Corps :
```json
{ "email": "alice@example.com", "password": "motdepasse123" }
```

Réponse `200` :
```json
{ "token": "<JWT>", "user": { ... } }
```

Erreurs : `401 Invalid credentials`, `429 Too many attempts` (5 échecs sur 15 min).

---

**GET /auth/me**

Réponse `200` :
```json
{
  "id": "...", "email": "...", "display_name": "...",
  "avatar_url": "/avatars/uuid.jpg",
  "quota_used": 1048576, "quota_total": 32212254720,
  "created_at": "2024-01-15T10:00:00Z"
}
```

---

### 7.2 Fichiers — `/files`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/files/upload` | Oui | Uploader un fichier (multipart/form-data) |
| GET | `/files/trash` | Oui | Lister la corbeille |
| DELETE | `/files/trash/empty` | Oui | Vider la corbeille |
| GET | `/files/:id/download` | Oui | Télécharger un fichier |
| GET | `/files/:id/preview` | Oui | Prévisualiser un fichier (streaming, Range support) |
| PATCH | `/files/:id` | Oui | Renommer / déplacer un fichier |
| DELETE | `/files/:id` | Oui | Mettre en corbeille (soft delete) |
| DELETE | `/files/:id/permanent` | Oui | Supprimer définitivement |
| POST | `/files/:id/restore` | Oui | Restaurer depuis la corbeille |

**POST /files/upload**

Content-Type : `multipart/form-data`  
Champs : `file` (fichier binaire), `folder_id` (UUID, optionnel).

Réponse `201` : objet `file` complet.  
Erreur `413` si le quota est dépassé.

---

**GET /files/:id/preview**

Supporte les requêtes partielles HTTP Range pour les fichiers non chiffrés (streaming audio/vidéo). Répond `206 Partial Content` si un header `Range` est présent.

---

**GET /files/trash**

Réponse `200` :
```json
{
  "files": [{ "id": "...", "name": "...", "mime_type": "...", "size": 1024, "updated_at": "..." }],
  "folders": [{ "id": "...", "name": "...", "updated_at": "..." }]
}
```

---

### 7.3 Dossiers — `/folders`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/folders` | Oui | Contenu de la racine (dossiers + fichiers) |
| GET | `/folders/:id` | Oui | Contenu d'un dossier |
| POST | `/folders` | Oui | Créer un dossier |
| PATCH | `/folders/:id` | Oui | Renommer / déplacer |
| DELETE | `/folders/:id` | Oui | Mettre en corbeille (récursif) |
| GET | `/folders/:id/zip` | Oui | Télécharger en archive ZIP |
| POST | `/folders/:id/restore` | Oui | Restaurer depuis la corbeille |
| POST | `/folders/:id/members` | Oui | Ajouter un membre |
| DELETE | `/folders/:id/members/:userId` | Oui | Retirer un membre |

**POST /folders**

Corps : `{ "name": "Projets", "parent_id": "<uuid>" }` (`parent_id` optionnel).

**POST /folders/:id/members**

Corps : `{ "user_id": "<uuid>", "permission": "read" | "write" }`.

La vérification d'accès autorise le propriétaire ET les membres listés dans `folder_members`.

---

### 7.4 Partages — `/shares`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/shares` | Oui | Lister ses liens de partage |
| GET | `/shares/with-me` | Oui | Dossiers partagés avec l'utilisateur |
| POST | `/shares` | Oui | Créer un lien de partage |
| GET | `/shares/:token` | Non | Accéder à un lien (public) |
| GET | `/shares/:token/download` | Non | Télécharger via un lien (public) |
| DELETE | `/shares/:id` | Oui | Révoquer un lien |

**POST /shares**

Corps :
```json
{
  "file_id": "<uuid>",
  "password": "secret",
  "expires_at": "2025-12-31T23:59:59Z"
}
```

`file_id` et `folder_id` sont mutuellement exclusifs ; l'un des deux est obligatoire.

**GET /shares/:token**

Réponse `200` : `{ "type": "file" | "folder", "resource": { ... } }`.  
Réponse `403` si le lien est protégé et qu'aucun mot de passe n'est fourni.  
Réponse `410` si le lien est expiré.

---

### 7.5 Tableau de bord — `/dashboard`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/quota` | Oui | Quota utilisé / total |
| GET | `/dashboard/recent` | Oui | 5 fichiers les plus récents |
| GET | `/dashboard/breakdown` | Oui | Répartition par type (Images, Videos, Audio, Documents, Other) |

**GET /dashboard/breakdown**

Réponse `200` :
```json
[
  { "category": "Images", "count": 42, "total_size": 104857600 },
  { "category": "Documents", "count": 15, "total_size": 52428800 }
]
```

---

### 7.6 Recherche — `/search`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/search` | Oui | Rechercher fichiers et dossiers |

**Paramètres de requête**

| Paramètre | Type | Description |
|---|---|---|
| `q` | string | Terme de recherche (ILIKE, autocomplétion) |
| `type` | string | Filtre par préfixe MIME (`image`, `video`, `audio`, …), virgule-séparé |
| `date` | string (ISO) | Filtre « modifié depuis » |

Réponse `200` :
```json
{
  "files": [{ "id": "...", "name": "...", "mime_type": "...", "size": 1024, "folder_id": "...", "updated_at": "..." }],
  "folders": [{ "id": "...", "name": "...", "parent_id": "...", "updated_at": "..." }]
}
```

Limites : 50 fichiers, 20 dossiers par requête.

---

### 7.7 Utilisateurs — `/users`

| Méthode | Route | Auth | Description |
|---|---|---|---|
| PUT | `/users/me` | Oui | Modifier email / display_name |
| PUT | `/users/me/password` | Oui | Changer le mot de passe |
| POST | `/users/me/avatar` | Oui | Uploader un avatar |
| DELETE | `/users/me/avatar` | Oui | Supprimer l'avatar |
| GET | `/users/lookup?email=` | Oui | Trouver un utilisateur par email |

**PUT /users/me/password**

Corps : `{ "current_password": "...", "new_password": "..." }` (minimum 8 caractères).

**GET /users/lookup**

Utilisé par l'interface pour résoudre un email en UUID avant d'inviter un membre dans un dossier partagé.

---

### 7.8 Autres

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | Non | Vérification de disponibilité |
| GET | `/avatars/:filename` | Non | Servir les avatars (express.static) |

---

## 8. Sécurité

### Authentification et autorisation

- Les mots de passe sont hachés avec **bcrypt** (cost factor 12).
- Les tokens JWT ont une durée de vie configurable (7 jours par défaut). Ils sont vérifiés sur chaque route protégée par `authMiddleware.js`.
- Aucune session serveur : l'état d'authentification est entièrement dans le token JWT stocké côté client (`localStorage`).

### Rate limiting

Deux limiteurs `express-rate-limit` protègent les routes d'authentification :

| Limiteur | Fenêtre | Limite | Comportement |
|---|---|---|---|
| `authLimiter` | 15 min | 10 requêtes | Appliqué sur `/auth/register` et `/auth/login` |
| `loginLimiter` | 15 min | 5 échecs | Appliqué sur `/auth/login` uniquement, compte seulement les réponses non-2xx |

### CORS

Le middleware `cors` autorise uniquement l'origine définie par `CLIENT_ORIGIN`. Les requêtes cross-origin portant des credentials sont activées.

### En-têtes HTTP

`helmet` est utilisé pour positionner les en-têtes de sécurité HTTP standard (CSP, X-Frame-Options, etc.). La politique `crossOriginResourcePolicy: 'cross-origin'` est étendue pour permettre au navigateur de charger les avatars depuis le serveur API.

### Chiffrement des fichiers

Si `ENCRYPTION_KEY` est défini (64 caractères hexadécimaux = 32 octets), chaque fichier uploadé est chiffré en **AES-256-CBC** avec un IV aléatoire de 16 octets préfixé sur le disque. Le déchiffrement se fait à la volée via un stream Node.js lors du download ou de la preview.

> Le chiffrement AES-CBC ne supporte pas les requêtes Range (accès aléatoire). Les fichiers chiffrés sont servis en stream complet, sans `206 Partial Content`.

### Validation des entrées

`express-validator` valide et assainit les entrées sur toutes les routes concernées. Les erreurs de validation retournent `422 Unprocessable Entity` avec un tableau d'erreurs détaillées.

### Quotas de stockage

Le service `quotaService` effectue une mise à jour atomique du quota : `quota_used + bytes <= quota_total`. Si la mise à jour ne retourne aucune ligne, une erreur `413 Payload Too Large` est levée avant l'écriture du fichier sur disque.

---

## 9. Structure du projet

```
supfileDev/
├── docker-compose.yml          # Orchestration des 3 services
├── .env                        # Variables d'environnement (non versionné)
├── docs/
│   ├── Documentation_Technique_SUPFile.md
│   └── Manuel_Utilisateur_SUPFile.md
├── server/                     # API Express
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js              # Point d'entrée, migration DB, montage des routes
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── dashboardController.js  # quota, recent, search, breakdown
│       │   ├── fileController.js
│       │   ├── folderController.js
│       │   ├── shareController.js
│       │   └── trashController.js
│       ├── db/
│       │   ├── index.js        # Pool pg, helper query()
│       │   ├── migrate.js
│       │   └── schema.sql      # Source de vérité du schéma
│       ├── middleware/
│       │   ├── authMiddleware.js       # Vérification JWT
│       │   ├── authOrQueryMiddleware.js
│       │   ├── rateLimitMiddleware.js  # authLimiter + loginLimiter
│       │   ├── uploadMiddleware.js     # multer
│       │   └── validate.js            # express-validator handler
│       ├── routes/
│       │   ├── auth.js
│       │   ├── dashboard.js
│       │   ├── files.js
│       │   ├── folders.js
│       │   ├── oauth.js        # Passport Google Strategy
│       │   ├── search.js
│       │   ├── shares.js
│       │   ├── trash.js
│       │   └── users.js
│       └── services/
│           ├── encryptionService.js    # AES-256-CBC
│           ├── fileAccess.js
│           ├── folderAccess.js
│           ├── quotaService.js         # checkAndIncrement, decrement
│           ├── storageService.js       # deleteFile
│           └── zipService.js           # streamFolderZip (archiver)
├── client-web/                 # Next.js 14 App Router
│   ├── Dockerfile              # Build multi-stage (deps → builder → runner)
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx      # Root layout (thème flash prevention)
│       │   ├── page.tsx        # Redirection vers /login ou /dashboard
│       │   ├── dashboard/page.tsx
│       │   ├── files/page.tsx
│       │   ├── login/page.tsx
│       │   ├── register/page.tsx
│       │   ├── settings/page.tsx
│       │   ├── shared/page.tsx         # Dossiers partagés avec moi
│       │   ├── trash/page.tsx
│       │   └── share/[token]/page.tsx  # Page de partage public
│       ├── components/
│       │   ├── AuthLayout.tsx
│       │   ├── DashboardLayout.tsx     # Nav, search bar, drawer mobile
│       │   ├── icons.tsx
│       │   └── ui/
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useDashboard.ts
│       └── lib/
│           ├── api.ts          # Instance Axios + intercepteur 401
│           ├── auth.ts         # JWT dans localStorage
│           ├── theme.ts
│           └── utils.ts
├── mobile/                     # React Native + Expo Router
│   ├── app/
│   │   ├── (auth)/             # login, register, forgot-password
│   │   ├── (tabs)/             # dashboard, files, shares, profile
│   │   ├── preview/[id].tsx
│   │   └── trash.tsx
│   ├── components/
│   ├── contexts/               # AuthContext, FilesContext, ThemeContext
│   ├── services/api/           # Couche API REST (auth, files, folders, shares, …)
│   └── utils/
└── shared/
    ├── Palette.txt             # Charte couleurs commune
    └── supfile.png             # Logo
```
