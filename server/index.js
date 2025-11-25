import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { pool } from './config/database.js'
import studentsRouter from './routes/students.js'
import courseOutcomesRouter from './routes/courseOutcomes.js'
import programOutcomesRouter from './routes/programOutcomes.js'
import coPoMappingRouter from './routes/coPoMapping.js'
import bloomLevelsRouter from './routes/bloomLevels.js'
import assessmentsRouter from './routes/assessments.js'
import studentMarksRouter from './routes/studentMarks.js'
import importMarksRouter from './routes/importMarks.js'
import subjectsRouter from './routes/subjects.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json({
      message: 'Server is running',
      database: 'Connected',
      timestamp: result.rows[0].now
    })
  } catch (error) {
    console.error('Database connection error:', error)
    res.json({
      message: 'Server is running',
      database: 'Not connected',
      error: error.message
    })
  }
})

// API Routes
app.use('/api/students', studentsRouter)
app.use('/api/course-outcomes', courseOutcomesRouter)
app.use('/api/program-outcomes', programOutcomesRouter)
app.use('/api/co-po-mapping', coPoMappingRouter)
app.use('/api/bloom-levels', bloomLevelsRouter)
app.use('/api/assessments', assessmentsRouter)
app.use('/api/student-marks', studentMarksRouter)
app.use('/api/import', importMarksRouter)
app.use('/api/subjects', subjectsRouter)

// Proxy frontend dev server requests to Vite (when frontend is running on port 3000)
// This allows accessing the frontend through port 5000
if (process.env.NODE_ENV !== 'production') {
  const frontendProxy = createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    ws: true,
    logLevel: 'warn',
    onError: (err, req, res) => {
      if (!res.headersSent) {
        res.status(503).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Frontend Not Running</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                h1 { color: #d32f2f; margin-bottom: 20px; }
                p { margin: 15px 0; line-height: 1.6; }
                code { background: #f5f5f5; padding: 8px 12px; border-radius: 3px; font-family: 'Courier New', monospace; color: #333; display: inline-block; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>⚠️ Frontend Dev Server Not Running</h1>
                <p>The frontend development server needs to be running on port 3000.</p>
                <p><strong>To fix this, open a new terminal and run:</strong></p>
                <p><code>cd client && npm run dev</code></p>
                <p>Then refresh this page.</p>
              </div>
            </body>
          </html>
        `)
      }
    }
  })

  // Handle all non-API routes - proxy to frontend
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      return frontendProxy(req, res, next)
    }
    next()
  })
  
  // Catch-all for any routes that weren't handled (shouldn't happen, but just in case)
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !res.headersSent) {
      res.status(503).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Frontend Not Running</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              h1 { color: #d32f2f; margin-bottom: 20px; }
              p { margin: 15px 0; line-height: 1.6; }
              code { background: #f5f5f5; padding: 8px 12px; border-radius: 3px; font-family: 'Courier New', monospace; color: #333; display: inline-block; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Frontend Dev Server Not Running</h1>
              <p>The frontend development server needs to be running on port 3000.</p>
              <p><strong>To fix this, open a new terminal and run:</strong></p>
              <p><code>cd client && npm run dev</code></p>
              <p>Then refresh this page.</p>
            </div>
          </body>
        </html>
      `)
    }
  })
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Frontend should be running on http://localhost:3000`)
    console.log(`Access the app at http://localhost:${PORT}`)
  }
})

