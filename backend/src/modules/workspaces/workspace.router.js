// src/modules/workspaces/workspace.router.js
const { Router } = require('express')
const { z }      = require('zod')
const { protect } = require('../../shared/middleware/auth')
const { asyncWrapper } = require('../../shared/middleware/errorHandler')
const { createWorkspace, getMyWorkspaces, getWorkspace, inviteMember } = require('./workspace.service')
const { getOnlineUsers } = require('../../config/websocket')

const router = Router()
router.use(protect)

router.post('/', asyncWrapper(async (req, res) => {
  const data = z.object({
    name: z.string().min(2),
    description: z.string().optional()
  }).parse(req.body)

  const workspace = await createWorkspace(data, req.user.userId)
  res.status(201).json({ success: true, data: workspace })
}))

router.get('/', asyncWrapper(async (req, res) => {
  const workspaces = await getMyWorkspaces(req.user.userId)
  res.json({ success: true, data: workspaces })
}))

router.get('/:id', asyncWrapper(async (req, res) => {
  const workspace   = await getWorkspace(req.params.id, req.user.userId)
  const onlineUsers = getOnlineUsers(req.params.id)
  res.json({ success: true, data: { ...workspace, onlineUsers } })
}))

router.post('/:id/invite', asyncWrapper(async (req, res) => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body)
  const member    = await inviteMember(req.params.id, email, req.user.userId)
  res.json({ success: true, data: member, message: `${member.full_name} added to workspace` })
}))

module.exports = router
