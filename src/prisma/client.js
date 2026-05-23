// src/prisma/client.js
import { PrismaClient } from '@prisma/client'

// Patrón singleton recomendado para evitar múltiples conexiones
// en entornos con hot-reload (desarrollo) o serverless (producción)
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
