// src/modules/auth/auth.service.js
const bcrypt      = require('bcryptjs')
const { pool }    = require('../../config/database')
const { signToken } = require('../../config/jwt')
const { AppError }  = require('../../shared/middleware/errorHandler')

const AVATAR_COLORS = ['#4ade80','#60a5fa','#f472b6','#fb923c','#a78bfa','#34d399','#f87171']

async function register({ email, password, fullName }) {
  const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (exists.rows.length) throw new AppError('Email already registered', 409)

  const hash  = await bcrypt.hash(password, 12)
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]

  const { rows } = await pool.query(
    `INSERT INTO users (email, password, full_name, avatar_color)
     VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, avatar_color`,
    [email, hash, fullName, color]
  )

  const user  = rows[0]
  const token = signToken({ userId: user.id, email: user.email, fullName: user.full_name })
  return { token, user: { id: user.id, email: user.email, fullName: user.full_name, avatarColor: user.avatar_color } }
}

async function login({ email, password }) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  const user = rows[0]

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401)
  }

  const token = signToken({ userId: user.id, email: user.email, fullName: user.full_name })
  return { token, user: { id: user.id, email: user.email, fullName: user.full_name, avatarColor: user.avatar_color } }
}

module.exports = { register, login }
