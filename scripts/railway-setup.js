#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateRailwayConfig() {
  console.log('🚀 Railway Production Setup');
  console.log('==========================================');
  console.log('');
  console.log('This script will help you configure your production environment for Railway.');
  console.log('');

  try {
    // Read current production config
    let prodConfig = fs.readFileSync('.env.production', 'utf8');

    console.log('📋 Current Railway services to configure:');
    console.log('1. PostgreSQL Database');
    console.log('2. Redis Cache');
    console.log('3. User Service');
    console.log('4. Auth Service');
    console.log('5. API Gateway');
    console.log('');

    const updateConfig = await question('Would you like to update Railway URLs? (y/n): ');
    
    if (updateConfig.toLowerCase() === 'y') {
      console.log('');
      console.log('🗄️  Database Configuration:');
      const dbUrl = await question('Enter Railway PostgreSQL URL: ');
      if (dbUrl.trim()) {
        prodConfig = prodConfig.replace(
          /DATABASE_URL=.*/,
          `DATABASE_URL=${dbUrl.trim()}`
        );
      }

      console.log('');
      console.log('⚡ Redis Configuration:');
      const redisUrl = await question('Enter Railway Redis URL: ');
      if (redisUrl.trim()) {
        prodConfig = prodConfig.replace(
          /REDIS_URL=.*/,
          `REDIS_URL=${redisUrl.trim()}`
        );
      }

      console.log('');
      console.log('🔐 Security Configuration:');
      const jwtSecret = await question('Enter JWT Secret (leave empty to generate): ');
      if (jwtSecret.trim()) {
        prodConfig = prodConfig.replace(
          /JWT_SECRET=.*/,
          `JWT_SECRET=${jwtSecret.trim()}`
        );
      } else {
        const crypto = require('crypto');
        const generatedSecret = crypto.randomBytes(64).toString('hex');
        prodConfig = prodConfig.replace(
          /JWT_SECRET=.*/,
          `JWT_SECRET=${generatedSecret}`
        );
        console.log('✅ Generated JWT secret automatically');
      }

      console.log('');
      console.log('🌐 Service URLs (after first deployment):');
      const userServiceUrl = await question('Enter User Service URL (optional): ');
      if (userServiceUrl.trim()) {
        prodConfig = prodConfig.replace(
          /USER_SERVICE_URL=.*/,
          `USER_SERVICE_URL=${userServiceUrl.trim()}`
        );
      }

      const authServiceUrl = await question('Enter Auth Service URL (optional): ');
      if (authServiceUrl.trim()) {
        prodConfig = prodConfig.replace(
          /AUTH_SERVICE_URL=.*/,
          `AUTH_SERVICE_URL=${authServiceUrl.trim()}`
        );
      }

      // Write updated config
      fs.writeFileSync('.env.production', prodConfig);
      console.log('');
      console.log('✅ Railway configuration updated!');
    }

    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Deploy services: npm run deploy:all');
    console.log('2. Update service URLs after first deployment');
    console.log('3. Run database migrations on Railway');
    console.log('4. Test production endpoints');
    console.log('');
    console.log('🔍 Railway Dashboard: https://railway.app/dashboard');

  } catch (error) {
    console.error('❌ Error updating Railway config:', error.message);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  updateRailwayConfig();
}

module.exports = { updateRailwayConfig }; 