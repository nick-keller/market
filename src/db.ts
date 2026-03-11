import { neon } from '@neondatabase/serverless'
import { PrismaClient } from '#/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

let client: ReturnType<typeof neon>

export async function getClient() {
  if (!process.env.DATABASE_URL) {
    return undefined
  }
  if (!client) {
    client = await neon(process.env.DATABASE_URL!)
  }
  return client
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
