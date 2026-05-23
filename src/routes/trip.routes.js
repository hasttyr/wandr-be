// src/routes/trip.routes.js
import { Router } from 'express'
import { createTrip, listTrips, getTrip, deleteTrip } from '../controllers/trip.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate, createTripSchema } from '../validators/schemas.js'

const router = Router()

router.use(authenticate) // todas las rutas de viajes requieren auth

router.post('/', validate(createTripSchema), createTrip)
router.get('/', listTrips)
router.get('/:id', getTrip)
router.delete('/:id', deleteTrip)

export default router
