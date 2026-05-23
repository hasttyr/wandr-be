// prisma/seed.js — datos de prueba
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando base de datos...')

  // Usuario de prueba
  const hash = await bcrypt.hash('password123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@wandr.app' },
    update: {},
    create: {
      nombre: 'Usuario Demo',
      email: 'demo@wandr.app',
      passwordHash: hash,
    },
  })

  console.log(`✅ Usuario creado: ${user.email}`)

  // Viaje de prueba
  const trip = await prisma.trip.create({
    data: {
      usuarioId: user.id,
      destino: 'Cartagena, Colombia',
      fechaInicio: new Date('2026-07-10'),
      fechaFin: new Date('2026-07-14'),
      presupuesto: 1500000,
      preferences: {
        create: {
          tipoTurismo: 'cultural',
          transporte: 'vuelo',
          alojamiento: 'hotel',
        },
      },
      itineraries: {
        createMany: {
          data: [
            { dia: 1, hora: '09:00', actividad: 'Visita al Castillo de San Felipe', ubicacion: 'Cartagena centro', costoEstimado: 35000, orden: 1 },
            { dia: 1, hora: '14:00', actividad: 'Almuerzo en La Cevichería', ubicacion: 'El Centro', costoEstimado: 80000, orden: 2 },
            { dia: 2, hora: '10:00', actividad: 'Tour por la Ciudad Amurallada', ubicacion: 'Centro histórico', costoEstimado: 50000, orden: 1 },
          ],
        },
      },
    },
  })

  console.log(`✅ Viaje de prueba creado: ${trip.destino}`)
  console.log('\n📋 Credenciales de prueba:')
  console.log('   Email:    demo@wandr.app')
  console.log('   Password: password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
