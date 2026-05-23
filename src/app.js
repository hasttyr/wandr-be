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

// ── Seguridad HTTP ──────────────────────────────────────────────────────────
app.use(helmet())

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Rate limiting ───────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta en 15 minutos.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // máx 10 intentos de login por IP cada 15 min
  message: { error: 'Demasiados intentos de autenticación. Intenta más tarde.' },
})

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // 20 generaciones por hora por IP (respeta el free tier de HF)
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
  console.error('[Error]', err)
  const status = err.status || 500
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message
  res.status(status).json({ error: message })
})

export default app
