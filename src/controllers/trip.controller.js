// src/controllers/trip.controller.js
import prisma from '../prisma/client.js'

// POST /api/trips
export async function createTrip(req, res, next) {
  try {
    const {
      destino, fechaInicio, fechaFin, presupuesto,
      tipoTurismo, transporte, alojamiento,
    } = req.body

    const trip = await prisma.trip.create({
      data: {
        usuarioId: req.user.id,
        destino,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        presupuesto,
        preferences: {
          create: { tipoTurismo, transporte, alojamiento },
        },
      },
      include: { preferences: true },
    })

    res.status(201).json(trip)
  } catch (err) {
    next(err)
  }
}

// GET /api/trips
export async function listTrips(req, res, next) {
  try {
    const trips = await prisma.trip.findMany({
      where: { usuarioId: req.user.id },
      include: {
        preferences: true,
        _count: { select: { itineraries: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(trips)
  } catch (err) {
    next(err)
  }
}

// GET /api/trips/:id
export async function getTrip(req, res, next) {
  try {
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.id, usuarioId: req.user.id },
      include: {
        preferences: true,
        itineraries: {
          orderBy: [{ dia: 'asc' }, { orden: 'asc' }],
        },
      },
    })

    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado' })

    res.json(trip)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/trips/:id
export async function deleteTrip(req, res, next) {
  try {
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.id, usuarioId: req.user.id },
    })

    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado' })

    await prisma.trip.delete({ where: { id: req.params.id } })

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
