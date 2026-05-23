// src/app.js
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.routes.js'
import tripRoutes from './routes/trip.routes.js'
import aiRoutes from './routes/ai.routes.js'
import itineraryRoutes from './routes/itinerary.routes.js'

const app = express()

// ── Render usa un proxy inverso — confiar en él para rate limiting por IP ──
app.set('trust proxy', 1)

// ── Seguridad HTTP ──────────────────────────────────────────────────────────
app.use(helmet())

// ── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim().replace(/\/$/, ''))
  : ['http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)
    const clean = origin.replace(/\/$/, '')
    if (allowedOrigins.includes(clean)) return callback(null, true)
    callback(new Error(`CORS: origin no permitido — ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Rate limiting ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta en 15 minutos.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de autenticación. Intenta más tarde.' },
})

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Límite de generación IA alcanzado. Intenta en una hora.' },
})

app.use(globalLimiter)

// ── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false }))

// ── Rutas ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/ai', aiLimiter, aiRoutes)
app.use('/api/itinerary', itineraryRoutes)

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

// ── Error handler global ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  // Silenciar errores CORS en los logs (son normales en preflight)
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message })
  }
  console.error('[Error]', err)
  const status = err.status || 500
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message
  res.status(status).json({ error: message })
})

export default app
