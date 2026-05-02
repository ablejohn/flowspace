// src/config/jwt.js
const jwt = require('jsonwebtoken')

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required but not set')
}

const SECRET     = process.env.JWT_SECRET
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

const signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

module.exports = { signToken, verifyToken }
