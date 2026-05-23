-- ============================================================
-- SUPFile — PostgreSQL Schema
-- Single source of truth for the whole team.
-- Run once to initialise a fresh database:
--   psql -U supfile -d supfile_dev -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ──────────────────────────────────────────────────────────────
-- 1. USERS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,                        -- NULL when OAuth-only account
  display_name    TEXT NOT NULL DEFAULT '',
  avatar_url      TEXT,
  quota_used      BIGINT NOT NULL DEFAULT 0,   -- bytes
  quota_total     BIGINT NOT NULL DEFAULT 32212254720,  -- 30 GB
  oauth_provider  TEXT,                        -- 'google' | 'github' | NULL
  oauth_id        TEXT,                        -- provider's user id
  theme           TEXT NOT NULL DEFAULT 'system',  -- 'light' | 'dark' | 'system'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (oauth_provider, oauth_id)
);

-- ──────────────────────────────────────────────────────────────
-- 2. FOLDERS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES folders(id) ON DELETE CASCADE,  -- NULL = root
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trashed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 3. FILES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  folder_id     UUID REFERENCES folders(id) ON DELETE SET NULL,  -- NULL = root
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime_type     TEXT NOT NULL,
  size          BIGINT NOT NULL DEFAULT 0,     -- bytes
  storage_path  TEXT NOT NULL,                 -- path on Docker volume
  trashed       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- 4. SHARES (public links)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT NOT NULL UNIQUE,          -- random URL-safe token
  file_id       UUID REFERENCES files(id) ON DELETE CASCADE,
  folder_id     UUID REFERENCES folders(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT,                          -- NULL = public (no password)
  expires_at    TIMESTAMPTZ,                   -- NULL = never expires
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shares_target CHECK (
    (file_id IS NOT NULL AND folder_id IS NULL) OR
    (file_id IS NULL AND folder_id IS NOT NULL)
  )
);

-- ──────────────────────────────────────────────────────────────
-- 5. FOLDER_MEMBERS (internal sharing between registered users)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folder_members (
  folder_id   UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (folder_id, user_id)
);

-- ──────────────────────────────────────────────────────────────
-- INDEXES (performance)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_folders_owner   ON folders(owner_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent  ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_owner     ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_folder    ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_trashed   ON files(trashed);
CREATE INDEX IF NOT EXISTS idx_shares_token    ON shares(token);
CREATE INDEX IF NOT EXISTS idx_shares_owner    ON shares(owner_id);

-- Fulltext search index on file/folder names
CREATE INDEX IF NOT EXISTS idx_files_name_fts   ON files USING GIN (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_folders_name_fts ON folders USING GIN (to_tsvector('simple', name));

-- ──────────────────────────────────────────────────────────────
-- AUTO-UPDATE updated_at
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Migrations for existing databases
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system';

-- Password reset (forgot-password flow)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
