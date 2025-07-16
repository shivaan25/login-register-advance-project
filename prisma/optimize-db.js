const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function optimizeDatabase() {
  console.log('🔧 Optimizing database for 10M user seeding...\n');

  try {
    // 1. Increase database settings for bulk operations
    console.log('📈 Adjusting PostgreSQL settings...');
    await prisma.$executeRaw`
      ALTER SYSTEM SET maintenance_work_mem = '2GB';
    `;
    await prisma.$executeRaw`
      ALTER SYSTEM SET checkpoint_segments = 64;
    `;
    await prisma.$executeRaw`
      ALTER SYSTEM SET wal_buffers = '64MB';
    `;
    
    // 2. Drop indexes temporarily for faster inserts
    console.log('🗂️  Temporarily dropping indexes...');
    await prisma.$executeRaw`
      DROP INDEX IF EXISTS "User_email_idx";
    `;
    
    // 3. Disable constraints temporarily
    console.log('🔓 Disabling constraints...');
    await prisma.$executeRaw`
      ALTER TABLE "User" DISABLE TRIGGER ALL;
    `;

    console.log('✅ Database optimized for bulk seeding');
    console.log('⚠️  Remember to run restore-db.js after seeding!');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    throw error;
  }
}

async function main() {
  await optimizeDatabase();
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

```javascript:prisma/restore-db.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreDatabase() {
  console.log('🔄 Restoring database settings after seeding...\n');

  try {
    // 1. Re-enable constraints
    console.log('🔒 Re-enabling constraints...');
    await prisma.$executeRaw`
      ALTER TABLE "User" ENABLE TRIGGER ALL;
    `;

    // 2. Recreate indexes
    console.log('🗂️  Recreating indexes...');
    await prisma.$executeRaw`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_email_idx" ON "User"("email");
    `;
    
    // 3. Update table statistics
    console.log('📊 Updating table statistics...');
    await prisma.$executeRaw`
      ANALYZE "User";
    `;
    
    // 4. Vacuum table for optimal performance
    console.log('🧹 Vacuuming table...');
    await prisma.$executeRaw`
      VACUUM ANALYZE "User";
    `;

    console.log('✅ Database restored successfully');
    console.log('🚀 Ready for production traffic!');

  } catch (error) {
    console.error('❌ Database restoration failed:', error);
    throw error;
  }
}

async function main() {
  await restoreDatabase();
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

## 📋 **Step-by-Step Guide to Seed 10 Million Users**

### **1. Preparation Phase** [[memory:3312953]]

Before starting, you need to understand the production-level considerations:

**Database Setup:**
- **Storage**: 10M users ≈ 2-3GB of data
- **Memory**: Your database needs at least 4GB RAM
- **Connection Limits**: Increase PostgreSQL max_connections
- **Timeout Settings**: Increase statement_timeout for long operations

**System Requirements:**
- **Local**: 16GB RAM recommended, 10GB free disk space
- **Production**: Use a dedicated database instance
- **Network**: Stable connection (process takes 2-4 hours)

### **2. Database Optimization**

```bash
# Step 1: Optimize database for bulk operations
node prisma/optimize-db.js
```

This script:
- Drops indexes temporarily (faster inserts)
- Adjusts PostgreSQL memory settings
- Disables triggers for speed

### **3. Run the Optimized Seeding**

```bash
# Step 2: Start the seeding process
node prisma/seed-optimized.js
```

**Features of the optimized seeder:**
- **Resume Capability**: Automatically resumes if interrupted
- **Progress Tracking**: Real-time progress with ETA
- **Concurrent Processing**: Processes 5 batches simultaneously
- **Error Handling**: Continues on individual batch failures
- **Memory Efficient**: Generates data in small batches
- **Predictable Emails**: Uses `user1@company.com` format

### **4. Monitor Progress**

The seeder provides real-time monitoring:
```
📊 Seeding Progress:
├── Users Created: 2,847,000 / 10,000,000
├── Batches Done: 2,847
├── Progress: 28.47%
├── Rate: 1,425 users/sec
├── Elapsed: 1,998s
├── ETA: 5,013s (84min)
├── Errors: 0
└── Duplicates Skipped: 0
```

### **5. Database Restoration**

```bash
# Step 3: Restore database settings
node prisma/restore-db.js
```

This script:
- Re-enables constraints and triggers
- Recreates indexes for optimal queries
- Updates table statistics
- Runs VACUUM for performance

### **6. Verification**

```bash
# Check total user count
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => {
  console.log('Total users:', count.toLocaleString());
  prisma.\$disconnect();
});
"
```

## ⚡ **Performance Expectations**

**Timing Estimates:**
- **Local PostgreSQL**: 2-4 hours
- **Railway/Cloud DB**: 4-8 hours (network dependent)
- **Rate**: 1,000-3,000 users/second

**Memory Usage:**
- **Node.js Process**: ~200MB
- **Database**: 2-4GB during operation
- **Disk I/O**: High during seeding

## 🛡️ **Safety Features**

1. **Resume Capability**: Automatically resumes from last checkpoint
2. **Progress Saving**: Saves progress every 100 batches
3. **Error Recovery**: Continues processing despite individual failures
4. **Graceful Shutdown**: Handle Ctrl+C safely
5. **Duplicate Prevention**: Uses `skipDuplicates: true`

## 🎯 **Production Considerations** [[memory:3232180]]

**For Railway Deployment:**
- Use their database service (not local PostgreSQL)
- Monitor connection limits during seeding
- Consider seeding during low-traffic hours
- Set up database monitoring before starting

**For Testing:**
- Start with 100,000 users first to test the process
- Monitor system resources during seeding
- Test application performance with large dataset

Would you like me to create these optimized seeding files and help you run the process step by step? 