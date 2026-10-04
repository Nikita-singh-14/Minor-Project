import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import mongoose from 'mongoose'
import jobsRouter from './routes/jobs.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    database: !process.env.MONGODB_URI
      ? 'not-configured'
      : mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use('/api/jobs', jobsRouter)

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' })
})

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error)
  response.status(500).json({ error: 'Internal server error' })
})

export default app