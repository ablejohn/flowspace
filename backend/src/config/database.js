// src/config/database.js
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function initDB() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        full_name   TEXT NOT NULL,
        avatar_color TEXT DEFAULT '#4ade80',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        TEXT NOT NULL,
        slug        TEXT UNIQUE NOT NULL,
        description TEXT,
        owner_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
        role         TEXT DEFAULT 'MEMBER', -- OWNER | ADMIN | MEMBER
        joined_at    TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (workspace_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        description  TEXT,
        status       TEXT DEFAULT 'TODO',   -- TODO | IN_PROGRESS | IN_REVIEW | DONE
        priority     TEXT DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | URGENT
        assignee_id  UUID REFERENCES users(id) ON DELETE SET NULL,
        created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
        due_date     TIMESTAMPTZ,
        position     INTEGER DEFAULT 0,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_comments (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
        user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Auto-update updated_at on tasks
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
      CREATE TRIGGER tasks_updated_at
        BEFORE UPDATE ON tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `)
    console.log('✅ Database schema ready')
  } finally {
    client.release()
  }
}

module.exports = { pool, initDB }
