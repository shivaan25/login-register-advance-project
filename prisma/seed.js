const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function main() {
  const USERS_TO_CREATE = 1000; // Change this number as needed

  const userData = Array.from({ length: USERS_TO_CREATE }).map(() => ({
    email: faker.internet.email(),
    password: faker.internet.password(12), // In real apps, hash passwords!
    createdAt: faker.date.past(),
  }));

  // Optionally, hash passwords here if you want to simulate real data
  // for (const user of userData) {
  //   user.password = await bcrypt.hash(user.password, 10);
  // }

  await prisma.user.createMany({
    data: userData,
    skipDuplicates: true, // In case of email collisions
  });

  console.log(`Seeded ${USERS_TO_CREATE} users`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 