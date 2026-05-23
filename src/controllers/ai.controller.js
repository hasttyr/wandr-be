// src/controllers/ai.controller.js
import prisma from '../prisma/client.js'
import { generateItinerary } from '../services/ai.service.js'

// POST /api/ai/generate
export async function generate(req, res, next) {
  try {
    const { tripId } = req.body

    // 1. Verificar que el viaje existe y pertenece al usuario
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, usuarioId: req.user.id },
      include: { preferences: true },
    })

    if (!trip) {
      return res.status(404).json({ error: 'Viaje no encontrado' })
    }
    if (!trip.preferences) {
      return res.status(400).json({ error: 'El viaje no tiene preferencias configuradas' })
    }

    // 2. Borrar itinerario anterior si existe (regeneración)
    await prisma.itinerary.deleteMany({ where: { viajeId: tripId } })

    // 3. Llamar al servicio de IA
    const activities = await generateItinerary(trip)

    // 4. Persistir en lote
    await prisma.itinerary.createMany({ data: activities })

    // 5. Devolver itinerario completo agrupado por día
    const saved = await prisma.itinerary.findMany({
      where: { viajeId: tripId },
      orderBy: [{ dia: 'asc' }, { orden: 'asc' }],
    })

    const byDay = saved.reduce((acc, item) => {
      if (!acc[item.dia]) acc[item.dia] = []
      acc[item.dia].push(item)
      return acc
    }, {})

    res.status(201).json({
      tripId,
      destino: trip.destino,
      days: byDay,
      total: saved.length,
    })
  } catch (err) {
    // Propagar errores con status específico (ej. 503 modelo cargando)
    if (err.status) {
      return res.status(err.status).json({ error: err.message })
    }
    next(err)
  }
}
