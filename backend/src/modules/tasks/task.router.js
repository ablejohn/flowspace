// src/modules/tasks/task.router.js
const { Router } = require('express')
const { z }      = require('zod')
const { protect } = require('../../shared/middleware/auth')
const { asyncWrapper } = require('../../shared/middleware/errorHandler')
const { createTask, getTasks, updateTask, deleteTask, addComment, getComments } = require('./task.service')

const router = Router({ mergeParams: true })
router.use(protect)

const taskSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  status:      z.enum(['TODO','IN_PROGRESS','IN_REVIEW','DONE']).optional(),
  priority:    z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),
  assigneeId:  z.string().uuid().optional(),
  dueDate:     z.string().optional(),
})

// All task routes require workspaceId query param
// GET  /api/v1/tasks?workspaceId=xxx
// POST /api/v1/tasks?workspaceId=xxx

router.get('/', asyncWrapper(async (req, res) => {
  const { workspaceId, status, assigneeId, priority } = req.query
  const tasks = await getTasks(workspaceId, req.user.userId, { status, assigneeId, priority })
  res.json({ success: true, data: tasks })
}))

router.post('/', asyncWrapper(async (req, res) => {
  const { workspaceId } = req.query
  const data = taskSchema.parse(req.body)
  const task = await createTask(workspaceId, req.user.userId, data)
  res.status(201).json({ success: true, data: task })
}))

router.patch('/:id', asyncWrapper(async (req, res) => {
  const { workspaceId } = req.query
  const task = await updateTask(req.params.id, workspaceId, req.user.userId, req.body)
  res.json({ success: true, data: task })
}))

router.delete('/:id', asyncWrapper(async (req, res) => {
  const { workspaceId } = req.query
  await deleteTask(req.params.id, workspaceId, req.user.userId)
  res.json({ success: true, message: 'Task deleted' })
}))

router.get('/:id/comments', asyncWrapper(async (req, res) => {
  const { workspaceId } = req.query
  const comments = await getComments(req.params.id, workspaceId, req.user.userId)
  res.json({ success: true, data: comments })
}))

router.post('/:id/comments', asyncWrapper(async (req, res) => {
  const { workspaceId } = req.query
  const { content } = z.object({ content: z.string().min(1) }).parse(req.body)
  const comment = await addComment(req.params.id, workspaceId, req.user.userId, content)
  res.status(201).json({ success: true, data: comment })
}))

module.exports = router
