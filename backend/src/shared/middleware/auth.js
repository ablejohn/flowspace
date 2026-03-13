// src/shared/middleware/auth.js
const { verifyToken } = require('../../config/jwt')
const { AppError }    = require('./errorHandler')

const protect = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new AppError('Unauthorized', 401)

  const token   = header.split(' ')[1]
  const payload = verifyToken(token)
  if (!payload) throw new AppError('Invalid or expired token', 401)

  req.user = payload
  next()
}

module.exports = { protect }
