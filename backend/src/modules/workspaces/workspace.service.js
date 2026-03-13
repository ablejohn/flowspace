// src/modules/workspaces/workspace.service.js
const { pool }      = require('../../config/database')
const { AppError }  = require('../../shared/middleware/errorHandler')

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function createWorkspace({ name, description }, ownerId) {
  let slug = slugify(name)

  // Make slug unique
  const exists = await pool.query('SELECT id FROM workspaces WHERE slug = $1', [slug])
  if (exists.rows.length) slug = `${slug}-${Date.now()}`

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO workspaces (name, slug, description, owner_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, slug, description, ownerId]
    )
    const workspace = rows[0]

    // Owner is automatically a member
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
      [workspace.id, ownerId]
    )

    await client.query('COMMIT')
    return workspace
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function getMyWorkspaces(userId) {
  const { rows } = await pool.query(
    `SELECT w.*, wm.role,
            (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS member_count,
            (SELECT COUNT(*) FROM tasks WHERE workspace_id = w.id) AS task_count
     FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id
     WHERE wm.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  )
  return rows
}

async function getWorkspace(workspaceId, userId) {
  // Check membership
  const member = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  )
  if (!member.rows.length) throw new AppError('Workspace not found or access denied', 404)

  const { rows } = await pool.query(
    `SELECT w.*,
            (SELECT json_agg(json_build_object(
              'userId', u.id, 'fullName', u.full_name,
              'email', u.email, 'avatarColor', u.avatar_color, 'role', wm.role
            ))
            FROM workspace_members wm
            JOIN users u ON u.id = wm.user_id
            WHERE wm.workspace_id = w.id) AS members
     FROM workspaces w WHERE w.id = $1`,
    [workspaceId]
  )
  return rows[0]
}

async function inviteMember(workspaceId, email, inviterId) {
  // Check inviter is OWNER or ADMIN
  const inviter = await pool.query(
    `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, inviterId]
  )
  if (!inviter.rows.length || !['OWNER','ADMIN'].includes(inviter.rows[0].role)) {
    throw new AppError('Only workspace admins can invite members', 403)
  }

  const user = await pool.query('SELECT id, full_name FROM users WHERE email = $1', [email])
  if (!user.rows.length) throw new AppError('No user found with that email', 404)

  const invitee = user.rows[0]

  const alreadyMember = await pool.query(
    'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, invitee.id]
  )
  if (alreadyMember.rows.length) throw new AppError('User is already a member', 409)

  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
    [workspaceId, invitee.id]
  )

  return invitee
}

module.exports = { createWorkspace, getMyWorkspaces, getWorkspace, inviteMember }
