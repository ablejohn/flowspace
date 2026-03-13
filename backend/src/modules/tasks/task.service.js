// src/modules/tasks/task.service.js
const { pool }     = require('../../config/database')
const { AppError } = require('../../shared/middleware/errorHandler')
const { broadcastToWorkspace } = require('../../config/websocket')

// Valid status transitions — any status can move to any other status
const TRANSITIONS = {
  TODO:        ['IN_PROGRESS', 'IN_REVIEW', 'DONE'],
  IN_PROGRESS: ['TODO', 'IN_REVIEW', 'DONE'],
  IN_REVIEW:   ['TODO', 'IN_PROGRESS', 'DONE'],
  DONE:        ['TODO', 'IN_PROGRESS', 'IN_REVIEW'],
}

async function assertMember(workspaceId, userId) {
  const { rows } = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  )
  if (!rows.length) throw new AppError('Access denied', 403)
  return rows[0].role
}

async function createTask(workspaceId, userId, data) {
  await assertMember(workspaceId, userId)

  const { rows } = await pool.query(
    `INSERT INTO tasks (workspace_id, title, description, status, priority, assignee_id, created_by, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *, (SELECT full_name FROM users WHERE id = $7) AS creator_name`,
    [workspaceId, data.title, data.description, data.status || 'TODO',
     data.priority || 'MEDIUM', data.assigneeId || null, userId, data.dueDate || null]
  )

  const task = rows[0]

  // 🔴 Real-time broadcast — all workspace members see the new task instantly
  broadcastToWorkspace(workspaceId, {
    type:    'TASK_CREATED',
    payload: task
  })

  return task
}

async function getTasks(workspaceId, userId, filters = {}) {
  await assertMember(workspaceId, userId)

  let query = `
    SELECT t.*,
           u.full_name  AS assignee_name,
           u.avatar_color AS assignee_color,
           c.full_name  AS creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.workspace_id = $1
  `
  const params = [workspaceId]

  if (filters.status) {
    params.push(filters.status)
    query += ` AND t.status = $${params.length}`
  }
  if (filters.assigneeId) {
    params.push(filters.assigneeId)
    query += ` AND t.assignee_id = $${params.length}`
  }
  if (filters.priority) {
    params.push(filters.priority)
    query += ` AND t.priority = $${params.length}`
  }

  query += ' ORDER BY t.created_at DESC'

  const { rows } = await pool.query(query, params)
  return rows
}

async function updateTask(taskId, workspaceId, userId, updates) {
  await assertMember(workspaceId, userId)

  // Fetch current task
  const current = await pool.query(
    'SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2',
    [taskId, workspaceId]
  )
  if (!current.rows.length) throw new AppError('Task not found', 404)

  const task = current.rows[0]

  // Validate status transition if status is being changed
  if (updates.status && updates.status !== task.status) {
    const allowed = TRANSITIONS[task.status] || []
    if (!allowed.includes(updates.status)) {
      throw new AppError(
        `Cannot move task from ${task.status} to ${updates.status}`,
        400
      )
    }
  }

  const { rows } = await pool.query(
    `UPDATE tasks SET
       title       = COALESCE($1, title),
       description = COALESCE($2, description),
       status      = COALESCE($3, status),
       priority    = COALESCE($4, priority),
       assignee_id = COALESCE($5, assignee_id),
       due_date    = COALESCE($6, due_date)
     WHERE id = $7 AND workspace_id = $8
     RETURNING *`,
    [updates.title, updates.description, updates.status,
     updates.priority, updates.assigneeId, updates.dueDate,
     taskId, workspaceId]
  )

  const updated = rows[0]

  // 🔴 Real-time broadcast — every connected member sees the update instantly
  broadcastToWorkspace(workspaceId, {
    type:    'TASK_UPDATED',
    payload: updated
  })

  return updated
}

async function deleteTask(taskId, workspaceId, userId) {
  const role = await assertMember(workspaceId, userId)

  const task = await pool.query(
    'SELECT * FROM tasks WHERE id = $1 AND workspace_id = $2',
    [taskId, workspaceId]
  )
  if (!task.rows.length) throw new AppError('Task not found', 404)

  // Only creator, admin or owner can delete
  const isCreator = task.rows[0].created_by === userId
  if (!isCreator && !['OWNER','ADMIN'].includes(role)) {
    throw new AppError('Only the task creator or an admin can delete this task', 403)
  }

  await pool.query('DELETE FROM tasks WHERE id = $1', [taskId])

  // 🔴 Real-time broadcast
  broadcastToWorkspace(workspaceId, {
    type:    'TASK_DELETED',
    payload: { taskId }
  })
}

async function addComment(taskId, workspaceId, userId, content) {
  await assertMember(workspaceId, userId)

  const { rows } = await pool.query(
    `INSERT INTO task_comments (task_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING *, (SELECT full_name FROM users WHERE id = $2) AS author_name,
                 (SELECT avatar_color FROM users WHERE id = $2) AS author_color`,
    [taskId, userId, content]
  )

  const comment = rows[0]

  // 🔴 Real-time broadcast — everyone sees the new comment instantly
  broadcastToWorkspace(workspaceId, {
    type:    'COMMENT_ADDED',
    payload: comment
  })

  return comment
}

async function getComments(taskId, workspaceId, userId) {
  await assertMember(workspaceId, userId)

  const { rows } = await pool.query(
    `SELECT tc.*, u.full_name AS author_name, u.avatar_color AS author_color
     FROM task_comments tc
     JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = $1
     ORDER BY tc.created_at ASC`,
    [taskId]
  )
  return rows
}

module.exports = { createTask, getTasks, updateTask, deleteTask, addComment, getComments }