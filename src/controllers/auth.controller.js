// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../prisma/client.js'

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  )
}

function safeUser(user) {
  const { passwordHash, ...rest } = user
  return rest
}

// POST /api/auth/register
export async function register(req, res, next) {
  try {
    const { nombre, email, password } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { nombre, email, passwordHash },
    })

    const token = signToken(user)
    res.status(201).json({ token, user: safeUser(user) })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Tiempo constante para no filtrar existencia de email
      await bcrypt.hash(password, 12)
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token = signToken(user)
    res.json({ token, user: safeUser(user) })
  } catch (err) {
    next(err)
  }
}

// GET /api/auth/profile  (requiere autenticación)
export async function profile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
        _count: { select: { trips: true } },
      },
    })

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

    res.json(user)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/auth/profile  (actualizar datos básicos)
export async function updateProfile(req, res, next) {
  try {
    const { nombre } = req.body
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { nombre },
      select: { id: true, nombre: true, email: true, createdAt: true },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
}
