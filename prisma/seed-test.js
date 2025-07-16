const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Test seeding configuration
const TEST_CONFIG = {
  USERS_100K: 100_000,
  USERS_1M: 1_000_000,
  BATCH_SIZE: 1000,
  CONCURRENT_BATCHES: 5,
  PLAIN_PASSWORD: 'Password123!',
};

async function seedTestUsers(totalUsers, testName) {
  console.log(`🧪 Starting ${testName} test seeding (${totalUsers.toLocaleString()} users)...\n`);
  
  const startTime = Date.now();
  const hashedPassword = await bcrypt.hash(TEST_CONFIG.PLAIN_PASSWORD, 10);
  const totalBatches = Math.ceil(totalUsers / TEST_CONFIG.BATCH_SIZE);
  
  let processed = 0;
  
  for (let batchId = 0; batchId < totalBatches; batchId += TEST_CONFIG.CONCURRENT_BATCHES) {
    const endBatch = Math.min(batchId + TEST_CONFIG.CONCURRENT_BATCHES, totalBatches);
    const batchPromises = [];
    
    for (let i = batchId; i < endBatch; i++) {
      const userData = Array.from({ length: TEST_CONFIG.BATCH_SIZE }, (_, index) => {
        const uniqueId = (i * TEST_CONFIG.BATCH_SIZE) + index + 1;
        return {
          email: `test${uniqueId}@company.com`,
          password: hashedPassword,
          createdAt: faker.date.recent({ days: 365 }),
        };
      });
      
      batchPromises.push(
        prisma.user.createMany({
          data: userData,
          skipDuplicates: true,
        })
      );
    }
    
    const results = await Promise.allSettled(batchPromises);
    const batchProcessed = results.reduce((sum, result) => {
      return sum + (result.status === 'fulfilled' ? result.value.count : 0);
    }, 0);
    
    processed += batchProcessed;
    
    if ((batchId / TEST_CONFIG.CONCURRENT_BATCHES) % 10 === 0) {
      const elapsed = Date.now() - startTime;
      const rate = processed / (elapsed / 1000);
      console.log(`📈 Progress: ${processed.toLocaleString()} / ${totalUsers.toLocaleString()} (${(processed/totalUsers*100).toFixed(1)}%) - Rate: ${Math.round(rate)} users/sec`);
    }
  }
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const avgRate = Math.round(processed / totalTime);
  
  console.log(`\n✅ ${testName} completed!`);
  console.log(`📊 Results:`);
  console.log(`├── Users created: ${processed.toLocaleString()}`);
  console.log(`├── Time taken: ${totalTime}s (${Math.round(totalTime/60)}min)`);
  console.log(`├── Average rate: ${avgRate} users/sec`);
  console.log(`└── Password: ${TEST_CONFIG.PLAIN_PASSWORD}`);
}

async function main() {
  const testType = process.argv[2];
  
  switch (testType) {
    case '100k':
      await seedTestUsers(TEST_CONFIG.USERS_100K, '100K Test');
      break;
    case '1m':
      await seedTestUsers(TEST_CONFIG.USERS_1M, '1M Test');
      break;
    default:
      console.log('🔧 Available test options:');
      console.log('  npm run seed:test:100k  - Seed 100,000 users');
      console.log('  npm run seed:test:1m    - Seed 1,000,000 users');
      process.exit(1);
  }
}

main()
  .catch(e => {
    console.error('❌ Test seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });