const { PrismaClient } = require('@prisma/client');

// Optimized Prisma client with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pooling configuration for high concurrency
  log: ['error', 'warn'],
  // Disable query logging in production for performance
  // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
});

// Health check for database
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
async function disconnect() {
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  checkDatabaseHealth,
  disconnect
}; 