// src/validators/schemas.js
import { z } from 'zod'

// ── Auth ────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(72),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

// ── Viajes ──────────────────────────────────────────────────────────────────
export const createTripSchema = z.object({
  destino: z.string().min(2, 'El destino es requerido').max(200),
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  // Acepta número o string numérico (el form HTML envía strings)
  // Máximo 999,999,999,999 COP (~1 billón) — suficiente para cualquier viaje
  presupuesto: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val),
    z.number()
      .positive('El presupuesto debe ser positivo')
      .max(999_999_999_999, 'El presupuesto no puede superar 999,999,999,999')
  ),
  tipoTurismo: z.enum(['cultural', 'aventura', 'gastronomia', 'playa', 'naturaleza'], {
    errorMap: () => ({ message: 'Tipo de turismo inválido' }),
  }),
  transporte: z.enum(['vuelo', 'tren', 'auto', 'bus']),
  alojamiento: z.enum(['hotel', 'hostal', 'airbnb', 'camping']),
}).refine(
  (data) => new Date(data.fechaFin) > new Date(data.fechaInicio),
  { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['fechaFin'] },
)

// ── IA ──────────────────────────────────────────────────────────────────────
export const generateItinerarySchema = z.object({
  tripId: z.string().uuid('ID de viaje inválido'),
})

// ── Middleware helper ────────────────────────────────────────────────────────
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return res.status(400).json({ error: 'Datos inválidos', details: errors })
    }
    req.body = result.data
    next()
  }
}
