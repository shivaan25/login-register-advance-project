const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySeeding() {
  console.log('🔍 Verifying database seeding...\n');
  
  try {
    // Get total user count
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total Users: ${totalUsers.toLocaleString()}`);
    
    // Get sample of users
    const sampleUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { id: 'asc' },
      select: { id: true, email: true, createdAt: true }
    });
    
    console.log('\n📋 Sample Users:');
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}, Email: ${user.email}, Created: ${user.createdAt.toISOString()}`);
    });
    
    // Check for email uniqueness
    const emailStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_emails,
        COUNT(DISTINCT email) as unique_emails
      FROM "User"
    `;
    
    const stats = emailStats[0];
    const duplicateEmails = Number(stats.total_emails) - Number(stats.unique_emails);
    
    console.log('\n🔍 Email Analysis:');
    console.log(`├── Total emails: ${Number(stats.total_emails).toLocaleString()}`);
    console.log(`├── Unique emails: ${Number(stats.unique_emails).toLocaleString()}`);
    console.log(`└── Duplicates: ${duplicateEmails.toLocaleString()}`);
    
    // Check date range
    const dateStats = await prisma.user.aggregate({
      _min: { createdAt: true },
      _max: { createdAt: true }
    });
    
    console.log('\n📅 Date Range:');
    console.log(`├── Earliest: ${dateStats._min.createdAt?.toISOString()}`);
    console.log(`└── Latest: ${dateStats._max.createdAt?.toISOString()}`);
    
    // Performance test
    console.log('\n⚡ Performance Test:');
    const perfStart = Date.now();
    
    const randomUser = await prisma.user.findFirst({
      where: { email: { contains: '@company.com' } }
    });
    
    const perfTime = Date.now() - perfStart;
    console.log(`├── Email search time: ${perfTime}ms`);
    console.log(`└── Found user: ${randomUser ? randomUser.email : 'None'}`);
    
    // Database size estimation
    const sizeQuery = await prisma.$queryRaw`
      SELECT 
        pg_size_pretty(pg_total_relation_size('"User"')) as table_size,
        pg_size_pretty(pg_relation_size('"User"')) as data_size
    `;
    
    const sizeStats = sizeQuery[0];
    console.log('\n💾 Database Size:');
    console.log(`├── Table size: ${sizeStats.table_size}`);
    console.log(`└── Data size: ${sizeStats.data_size}`);
    
    // Summary
    console.log('\n📈 Summary:');
    if (duplicateEmails === 0) {
      console.log('✅ All emails are unique');
    } else {
      console.log(`⚠️  Found ${duplicateEmails} duplicate emails`);
    }
    
    if (totalUsers >= 10_000_000) {
      console.log('🎉 10M users successfully seeded!');
    } else if (totalUsers >= 1_000_000) {
      console.log('🚀 1M+ users seeded');
    } else if (totalUsers >= 100_000) {
      console.log('✅ 100K+ users seeded');
    } else {
      console.log(`📊 ${totalUsers.toLocaleString()} users seeded`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

async function main() {
  await verifySeeding();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```
