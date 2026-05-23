// src/routes/auth.routes.js
import { Router } from 'express'
import { register, login, profile, updateProfile } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { validate, registerSchema, loginSchema } from '../validators/schemas.js'

const router = Router()

router.post('/register', validate(registerSchema), register)
router.post('/login', validate(loginSchema), login)
router.get('/profile', authenticate, profile)
router.patch('/profile', authenticate, updateProfile)

export default router
