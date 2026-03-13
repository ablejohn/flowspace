// src/config/jwt.js
const jwt = require('jsonwebtoken')

const SECRET     = process.env.JWT_SECRET || 'flowspace_dev_secret_min_32_chars_long'
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
