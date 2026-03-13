// src/shared/middleware/errorHandler.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
  }
}

const errorHandler = (err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message }
    })
  }
  console.error('💥 Unexpected error:', err)
  res.status(500).json({
    success: false,
    error: { message: 'An unexpected error occurred' }
  })
}

const asyncWrapper = (fn) => (req, res, next) => fn(req, res, next).catch(next)

module.exports = { AppError, errorHandler, asyncWrapper }
