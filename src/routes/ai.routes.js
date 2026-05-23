// src/routes/ai.routes.js
import { Router } from 'express'
import { generate } from '../controllers/ai.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate, generateItinerarySchema } from '../validators/schemas.js'

const router = Router()

router.post('/generate', authenticate, validate(generateItinerarySchema), generate)

export default router
