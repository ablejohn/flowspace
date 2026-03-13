// src/app.js
const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const morgan     = require('morgan')

const authRouter       = require('./modules/auth/auth.router')
const workspaceRouter  = require('./modules/workspaces/workspace.router')
const taskRouter       = require('./modules/tasks/task.router')
const { errorHandler } = require('./shared/middleware/errorHandler')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }))
app.use(morgan('dev'))
app.use(express.json())

// Routes
app.use('/api/v1/auth',       authRouter)
app.use('/api/v1/workspaces', workspaceRouter)
app.use('/api/v1/tasks',      taskRouter)

app.get('/health', (_, res) => res.json({ status: 'ok', project: 'Flowspace' }))

app.use(errorHandler)

module.exports = app
