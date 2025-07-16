const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Configuration
const CONFIG = {
  TOTAL_USERS: 10_000_000,
  BATCH_SIZE: 1000,           // Smaller batches for better performance
  CONCURRENT_BATCHES: 5,      // Process multiple batches concurrently
  PLAIN_PASSWORD: 'Password123!',
  PROGRESS_FILE: 'seed-progress.json',
  CHECKPOINT_INTERVAL: 100,   // Save progress every 100 batches
};

// Global password hash (compute once, reuse for all users)
let GLOBAL_PASSWORD_HASH = null;

class SeedingManager {
  constructor() {
    this.startTime = Date.now();
    this.progress = this.loadProgress();
    this.stats = {
      totalProcessed: this.progress.usersSeeded,
      batchesCompleted: this.progress.batchesCompleted,
      errors: 0,
      duplicatesSkipped: 0,
    };
  }

  loadProgress() {
    try {
      if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not load progress file, starting fresh');
    }
    return {
      usersSeeded: 0,
      batchesCompleted: 0,
      lastBatchId: 0,
    };
  }

  saveProgress() {
    fs.writeFileSync(CONFIG.PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
  }

  generateUserBatch(batchSize, batchId) {
    return Array.from({ length: batchSize }, (_, index) => {
      const uniqueId = (batchId * batchSize) + index + 1;
      return {
        email: `user${uniqueId}@company.com`, // Predictable unique emails
        password: GLOBAL_PASSWORD_HASH,
        createdAt: faker.date.between({
          from: new Date('2020-01-01'),
          to: new Date()
        }),
      };
    });
  }

  async processBatch(batchId) {
    try {
      const userData = this.generateUserBatch(CONFIG.BATCH_SIZE, batchId);
      
      const result = await prisma.user.createMany({
        data: userData,
        skipDuplicates: true,
      });

      this.stats.totalProcessed += result.count;
      this.stats.duplicatesSkipped += (CONFIG.BATCH_SIZE - result.count);

      return result.count;
    } catch (error) {
      this.stats.errors++;
      console.error(`Error in batch ${batchId}:`, error.message);
      return 0;
    }
  }

  async processConcurrentBatches(startBatchId, endBatchId) {
    const batchPromises = [];
    
    for (let batchId = startBatchId; batchId < endBatchId; batchId++) {
      batchPromises.push(this.processBatch(batchId));
    }

    const results = await Promise.allSettled(batchPromises);
    return results.reduce((total, result) => {
      return total + (result.status === 'fulfilled' ? result.value : 0);
    }, 0);
  }

  printProgress() {
    const elapsed = Date.now() - this.startTime;
    const rate = this.stats.totalProcessed / (elapsed / 1000);
    const remaining = CONFIG.TOTAL_USERS - this.stats.totalProcessed;
    const eta = remaining / rate;

    console.log('\n📊 Seeding Progress:');
    console.log(`├── Users Created: ${this.stats.totalProcessed.toLocaleString()} / ${CONFIG.TOTAL_USERS.toLocaleString()}`);
    console.log(`├── Batches Done: ${this.stats.batchesCompleted.toLocaleString()}`);
    console.log(`├── Progress: ${((this.stats.totalProcessed / CONFIG.TOTAL_USERS) * 100).toFixed(2)}%`);
    console.log(`├── Rate: ${Math.round(rate).toLocaleString()} users/sec`);
    console.log(`├── Elapsed: ${Math.round(elapsed / 1000)}s`);
    console.log(`├── ETA: ${Math.round(eta)}s (${Math.round(eta / 60)}min)`);
    console.log(`├── Errors: ${this.stats.errors}`);
    console.log(`└── Duplicates Skipped: ${this.stats.duplicatesSkipped}`);
  }

  async run() {
    try {
      console.log('🚀 Starting optimized seeding for 10 million users...\n');
      
      // Pre-compute password hash
      console.log('🔐 Computing password hash...');
      GLOBAL_PASSWORD_HASH = await bcrypt.hash(CONFIG.PLAIN_PASSWORD, 10);
      
      const totalBatches = Math.ceil(CONFIG.TOTAL_USERS / CONFIG.BATCH_SIZE);
      let currentBatch = this.progress.lastBatchId;

      console.log(`📦 Configuration:`);
      console.log(`├── Total Users: ${CONFIG.TOTAL_USERS.toLocaleString()}`);
      console.log(`├── Batch Size: ${CONFIG.BATCH_SIZE.toLocaleString()}`);
      console.log(`├── Concurrent Batches: ${CONFIG.CONCURRENT_BATCHES}`);
      console.log(`├── Total Batches: ${totalBatches.toLocaleString()}`);
      console.log(`└── Resuming from batch: ${currentBatch}\n`);

      while (currentBatch < totalBatches) {
        const endBatch = Math.min(currentBatch + CONFIG.CONCURRENT_BATCHES, totalBatches);
        
        await this.processConcurrentBatches(currentBatch, endBatch);
        
        this.progress.batchesCompleted += (endBatch - currentBatch);
        this.progress.lastBatchId = endBatch;
        this.stats.batchesCompleted = this.progress.batchesCompleted;
        
        // Save progress periodically
        if (this.progress.batchesCompleted % CONFIG.CHECKPOINT_INTERVAL === 0) {
          this.progress.usersSeeded = this.stats.totalProcessed;
          this.saveProgress();
        }

        this.printProgress();
        currentBatch = endBatch;
      }

      // Final save
      this.progress.usersSeeded = this.stats.totalProcessed;
      this.saveProgress();

      console.log('\n✅ Seeding completed successfully!');
      console.log(`🎉 Total users created: ${this.stats.totalProcessed.toLocaleString()}`);
      console.log(`⏱️  Total time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
      
      // Clean up progress file on completion
      if (fs.existsSync(CONFIG.PROGRESS_FILE)) {
        fs.unlinkSync(CONFIG.PROGRESS_FILE);
      }

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      this.saveProgress();
      throw error;
    }
  }
}

async function main() {
  const seeder = new SeedingManager();
  await seeder.run();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, saving progress...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, saving progress...');
  process.exit(0);
});

main()
  .catch(e => {
    console.error('💥 Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 