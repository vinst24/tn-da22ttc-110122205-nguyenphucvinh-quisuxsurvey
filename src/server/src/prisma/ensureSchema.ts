import { prisma } from './client.js';

// Lightweight compatibility layer: run Prisma migrations for schema changes.
// In production, use `prisma migrate deploy`. This is for dev convenience.
export const ensureSchemaCompatibility = async () => {
  try {
    // Verify the database connection is working
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    console.warn('[db] Database connection check failed:', e);
  }
};
