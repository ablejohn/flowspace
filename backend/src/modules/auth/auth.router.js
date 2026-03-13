// src/modules/auth/auth.router.js
const { Router } = require('express')
const { z }      = require('zod')
const { register, login } = require('./auth.service')
const { asyncWrapper, AppError } = require('../../shared/middleware/errorHandler')
const { protect } = require('../../shared/middleware/auth')
const { pool }    = require('../../config/database')

const router = Router()

const registerSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

router.post('/register', asyncWrapper(async (req, res) => {
  const data   = registerSchema.parse(req.body)
  const result = await register(data)
  res.status(201).json({ success: true, data: result })
}))

router.post('/login', asyncWrapper(async (req, res) => {
  const data   = loginSchema.parse(req.body)
  const result = await login(data)
  res.json({ success: true, data: result })
}))

router.get('/me', protect, asyncWrapper(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, avatar_color, created_at FROM users WHERE id = $1',
    [req.user.userId]
  )
  if (!rows.length) throw new AppError('User not found', 404)
  res.json({ success: true, data: rows[0] })
}))

module.exports = router
