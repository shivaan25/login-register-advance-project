const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:80';
const TOTAL_REQUESTS = 100000;
const CONCURRENT_REQUESTS = 1000;
const TEST_DURATION = 60; // seconds

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'Password123!' },
  { email: 'test2@example.com', password: 'Password123!' },
  { email: 'test3@example.com', password: 'Password123!' },
  { email: 'test4@example.com', password: 'Password123!' },
  { email: 'test5@example.com', password: 'Password123!' }
];

// Metrics
let successCount = 0;
let errorCount = 0;
let totalResponseTime = 0;
let minResponseTime = Infinity;
let maxResponseTime = 0;
let startTime = performance.now();

// Create axios instance with optimized settings
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  maxRedirects: 5,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'LoadTest/1.0'
  }
});

// Helper function to get random test user
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

// Helper function to generate unique email
function generateUniqueEmail() {
  return `test${Date.now()}${Math.random().toString(36).substr(2, 9)}@example.com`;
}

// Test functions
async function testLogin() {
  const user = getRandomUser();
  const start = performance.now();
  
  try {
    const response = await api.post('/api/login', user);
    const responseTime = performance.now() - start;
    
    successCount++;
    totalResponseTime += responseTime;
    minResponseTime = Math.min(minResponseTime, responseTime);
    maxResponseTime = Math.max(maxResponseTime, responseTime);
    
    return { success: true, responseTime, status: response.status };
  } catch (error) {
    const responseTime = performance.now() - start;
    errorCount++;
    
    return { 
      success: false, 
      responseTime, 
      status: error.response?.status || 'NETWORK_ERROR',
      error: error.message 
    };
  }
}

async function testRegister() {
  const user = {
    email: generateUniqueEmail(),
    password: 'Password123!'
  };
  const start = performance.now();
  
  try {
    const response = await api.post('/api/register', user);
    const responseTime = performance.now() - start;
    
    successCount++;
    totalResponseTime += responseTime;
    minResponseTime = Math.min(minResponseTime, responseTime);
    maxResponseTime = Math.max(maxResponseTime, responseTime);
    
    return { success: true, responseTime, status: response.status };
  } catch (error) {
    const responseTime = performance.now() - start;
    errorCount++;
    
    return { 
      success: false, 
      responseTime, 
      status: error.response?.status || 'NETWORK_ERROR',
      error: error.message 
    };
  }
}

async function testHealthCheck() {
  const start = performance.now();
  
  try {
    const response = await api.get('/health');
    const responseTime = performance.now() - start;
    
    successCount++;
    totalResponseTime += responseTime;
    minResponseTime = Math.min(minResponseTime, responseTime);
    maxResponseTime = Math.max(maxResponseTime, responseTime);
    
    return { success: true, responseTime, status: response.status };
  } catch (error) {
    const responseTime = performance.now() - start;
    errorCount++;
    
    return { 
      success: false, 
      responseTime, 
      status: error.response?.status || 'NETWORK_ERROR',
      error: error.message 
    };
  }
}

// Concurrent request executor
async function executeConcurrentRequests(testFunction, count) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(testFunction());
  }
  return Promise.all(promises);
}

// Main load test
async function runLoadTest() {
  console.log('🚀 Starting Load Test');
  console.log(`📊 Target: ${TOTAL_REQUESTS} requests`);
  console.log(`⚡ Concurrent: ${CONCURRENT_REQUESTS} requests`);
  console.log(`⏱️  Duration: ${TEST_DURATION} seconds`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));

  const testStartTime = performance.now();
  let completedRequests = 0;
  let batchNumber = 1;

  // Run test for specified duration
  const testInterval = setInterval(async () => {
    const elapsed = (performance.now() - testStartTime) / 1000;
    
    if (elapsed >= TEST_DURATION || completedRequests >= TOTAL_REQUESTS) {
      clearInterval(testInterval);
      printResults();
      return;
    }

    // Execute batch of concurrent requests
    const batchSize = Math.min(CONCURRENT_REQUESTS, TOTAL_REQUESTS - completedRequests);
    const batchStart = performance.now();
    
    const results = await executeConcurrentRequests(() => {
      // Randomly choose test type
      const testTypes = [testLogin, testRegister, testHealthCheck];
      const randomTest = testTypes[Math.floor(Math.random() * testTypes.length)];
      return randomTest();
    }, batchSize);

    const batchTime = performance.now() - batchStart;
    completedRequests += batchSize;

    // Print batch progress
    const currentRPS = (completedRequests / elapsed).toFixed(2);
    console.log(`Batch ${batchNumber}: ${batchSize} requests in ${batchTime.toFixed(2)}ms (${(batchSize / (batchTime / 1000)).toFixed(2)} RPS) - Total: ${completedRequests}/${TOTAL_REQUESTS} (${currentRPS} RPS avg)`);
    
    batchNumber++;
  }, 100); // Run batch every 100ms
}

// Print final results
function printResults() {
  const totalTime = (performance.now() - startTime) / 1000;
  const totalRequests = successCount + errorCount;
  const successRate = ((successCount / totalRequests) * 100).toFixed(2);
  const avgResponseTime = totalResponseTime / totalRequests;
  const requestsPerSecond = (totalRequests / totalTime).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('📈 LOAD TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`⏱️  Total Time: ${totalTime.toFixed(2)} seconds`);
  console.log(`📊 Total Requests: ${totalRequests}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`⚡ Requests/Second: ${requestsPerSecond}`);
  console.log(`📊 Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`🐌 Min Response Time: ${minResponseTime.toFixed(2)}ms`);
  console.log(`🚀 Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
  
  // Performance analysis
  console.log('\n📊 PERFORMANCE ANALYSIS');
  console.log('='.repeat(60));
  
  if (parseFloat(requestsPerSecond) >= 100000) {
    console.log('🎉 TARGET ACHIEVED: 100,000+ RPS!');
  } else if (parseFloat(requestsPerSecond) >= 50000) {
    console.log('✅ GOOD: 50,000+ RPS achieved');
  } else if (parseFloat(requestsPerSecond) >= 10000) {
    console.log('⚠️  MODERATE: 10,000+ RPS achieved');
  } else {
    console.log('❌ NEEDS OPTIMIZATION: Below 10,000 RPS');
  }
  
  if (parseFloat(successRate) >= 95) {
    console.log('🎉 EXCELLENT: 95%+ success rate');
  } else if (parseFloat(successRate) >= 90) {
    console.log('✅ GOOD: 90%+ success rate');
  } else {
    console.log('⚠️  NEEDS ATTENTION: Success rate below 90%');
  }
  
  if (avgResponseTime <= 100) {
    console.log('🎉 EXCELLENT: Sub-100ms average response time');
  } else if (avgResponseTime <= 500) {
    console.log('✅ GOOD: Sub-500ms average response time');
  } else {
    console.log('⚠️  NEEDS OPTIMIZATION: Response time above 500ms');
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the load test
runLoadTest().catch(console.error); 