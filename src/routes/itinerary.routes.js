// src/routes/itinerary.routes.js
import { Router } from 'express'
import { getItinerary } from '../controllers/itinerary.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/:tripId', authenticate, getItinerary)

export default router
