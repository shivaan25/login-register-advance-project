const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function generateUserBatch(batchSize, plainPassword) {
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  return Array.from({ length: batchSize }).map(() => ({
    email: faker.internet.email(),
    password: hashedPassword,
    createdAt: faker.date.past(),
  }));
}

async function main() {
  const TOTAL_USERS = 10_000_000;
  const BATCH_SIZE = 5000;
  const PLAIN_PASSWORD = 'Password123!'; // Use this for all users
  const TOTAL_BATCHES = Math.ceil(TOTAL_USERS / BATCH_SIZE);

  let batchesCompleted = 0;

  for (let i = 0; i < TOTAL_BATCHES; i++) {
    const userData = await generateUserBatch(BATCH_SIZE, PLAIN_PASSWORD);
    await prisma.user.createMany({
      data: userData,
      skipDuplicates: true,
    });
    batchesCompleted++;
    if (batchesCompleted % 10 === 0) {
      console.log(`Completed ${batchesCompleted} / ${TOTAL_BATCHES} batches (${batchesCompleted * BATCH_SIZE} users)`);
    }
  }

  console.log(`Seeded up to ${TOTAL_USERS} users. All users have password: ${PLAIN_PASSWORD}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 