#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const environments = {
  development: '.env.development',
  production: '.env.production',
  dev: '.env.development',
  prod: '.env.production'
};

const targetEnv = process.argv[2];

if (!targetEnv || !environments[targetEnv]) {
  console.log('🔧 Environment Switcher');
  console.log('');
  console.log('Usage: node scripts/env-switch.js <environment>');
  console.log('');
  console.log('Available environments:');
  console.log('  development (dev)  - Docker local setup');
  console.log('  production (prod)  - Railway cloud setup');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/env-switch.js development');
  console.log('  node scripts/env-switch.js prod');
  process.exit(1);
}

const sourceFile = environments[targetEnv];
const targetFile = '.env';

try {
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Environment file ${sourceFile} not found!`);
    process.exit(1);
  }

  // Copy environment file
  fs.copyFileSync(sourceFile, targetFile);
  
  // Also copy to services directories
  const serviceDirs = ['services/user-service', 'services/auth-service', 'services/api-gateway'];
  serviceDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.copyFileSync(sourceFile, path.join(dir, '.env'));
    }
  });

  const envName = targetEnv === 'dev' ? 'development' : targetEnv === 'prod' ? 'production' : targetEnv;
  
  console.log(`✅ Switched to ${envName} environment`);
  console.log(`📄 Active configuration: ${sourceFile}`);
  
  if (envName === 'development') {
    console.log('🐳 Ready for Docker development');
    console.log('   Database: localhost:5432 (Docker PostgreSQL)');
    console.log('   Redis: localhost:6379 (Docker Redis)');
  } else {
    console.log('🚀 Ready for Railway production');
    console.log('   Database: Railway PostgreSQL');
    console.log('   Redis: Railway Redis');
    console.log('⚠️  Remember to update Railway URLs in .env.production');
  }

} catch (error) {
  console.error('❌ Error switching environment:', error.message);
  process.exit(1);
} 