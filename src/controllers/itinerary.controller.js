// src/controllers/itinerary.controller.js
import prisma from '../prisma/client.js'

// GET /api/itinerary/:tripId
export async function getItinerary(req, res, next) {
  try {
    // Verificar que el viaje pertenece al usuario autenticado
    const trip = await prisma.trip.findFirst({
      where: { id: req.params.tripId, usuarioId: req.user.id },
    })

    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado' })

    const items = await prisma.itinerary.findMany({
      where: { viajeId: req.params.tripId },
      orderBy: [{ dia: 'asc' }, { orden: 'asc' }],
    })

    // Agrupar por día para facilitar la renderización en el frontend
    const byDay = items.reduce((acc, item) => {
      const day = item.dia
      if (!acc[day]) acc[day] = []
      acc[day].push(item)
      return acc
    }, {})

    res.json({ tripId: trip.id, destino: trip.destino, days: byDay, total: items.length })
  } catch (err) {
    next(err)
  }
}
