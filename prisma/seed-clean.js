const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Cleaning database...\n');
  
  try {
    // Get current user count
    const currentCount = await prisma.user.count();
    console.log(`📊 Current users: ${currentCount.toLocaleString()}`);
    
    if (currentCount === 0) {
      console.log('✅ Database is already clean');
      return;
    }
    
    // Confirm deletion
    console.log('⚠️  This will delete ALL users!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🗑️  Deleting all users...');
    const startTime = Date.now();
    
    // Delete in batches for better performance
    const batchSize = 10000;
    let deletedTotal = 0;
    
    while (true) {
      const result = await prisma.user.deleteMany({
        where: {
          id: {
            in: await prisma.user.findMany({
              take: batchSize,
              select: { id: true }
            }).then(users => users.map(u => u.id))
          }
        }
      });
      
      deletedTotal += result.count;
      
      if (result.count === 0) break;
      
      console.log(`🗑️  Deleted ${deletedTotal.toLocaleString()} users so far...`);
    }
    
    // Reset auto-increment counter
    await prisma.$executeRaw`ALTER SEQUENCE "User_id_seq" RESTART WITH 1`;
    
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n✅ Database cleaned successfully!`);
    console.log(`├── Users deleted: ${deletedTotal.toLocaleString()}`);
    console.log(`├── Time taken: ${totalTime}s`);
    console.log(`└── ID sequence reset to 1`);
    
    // Clean up progress file if it exists
    const progressFile = 'seed-progress.json';
    if (fs.existsSync(progressFile)) {
      fs.unlinkSync(progressFile);
      console.log('🗑️  Removed progress file');
    }
    
  } catch (error) {
    console.error('❌ Database cleaning failed:', error);
    throw error;
  }
}

async function main() {
  await cleanDatabase();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });