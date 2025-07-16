const axios = require('axios');

// Test configuration
const API_GATEWAY_URL = 'http://localhost:3000';
const AUTH_SERVICE_URL = 'http://localhost:3002';
const USER_SERVICE_URL = 'http://localhost:3001';

// Test data
const testUsers = [
  {
    email: 'test3001@company.com',
    password: 'Password123!'
  },
  {
    email: 'newuser@test.com',
    password: 'SecurePass456!'
  }
];

// Test results tracking
let passedTests = 0;
let failedTests = 0;
let testResults = [];

// Helper function to log test results
function logTest(testName, passed, message, duration = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const durationText = duration ? ` (${duration}ms)` : '';
  console.log(`${status} ${testName}${durationText}`);
  if (message) console.log(`   ${message}`);
  
  testResults.push({ testName, passed, message, duration });
  if (passed) passedTests++;
  else failedTests++;
}

// Test with timeout to catch hanging requests
async function makeRequest(config, timeoutMs = 10000) {
  const start = Date.now();
  try {
    const response = await axios({
      ...config,
      timeout: timeoutMs,
      validateStatus: () => true // Don't throw on non-2xx status codes
    });
    const duration = Date.now() - start;
    return { response, duration, timedOut: false };
  } catch (error) {
    const duration = Date.now() - start;
    if (error.code === 'ECONNABORTED') {
      return { response: null, duration, timedOut: true, error };
    }
    return { response: null, duration, timedOut: false, error };
  }
}

// Test 1: Service Health Checks
async function testServiceHealth() {
  console.log('\n🔍 Testing Service Health...');
  
  const services = [
    { name: 'API Gateway', url: `${API_GATEWAY_URL}/health` },
    { name: 'Auth Service', url: `${AUTH_SERVICE_URL}/health` },
    { name: 'User Service', url: `${USER_SERVICE_URL}/health` }
  ];
  
  for (const service of services) {
    const { response, duration, timedOut } = await makeRequest({
      method: 'GET',
      url: service.url
    });
    
    if (timedOut) {
      logTest(`${service.name} Health`, false, 'Request timed out', duration);
    } else if (response && response.status === 200) {
      logTest(`${service.name} Health`, true, `Status: ${response.data.status}`, duration);
    } else {
      logTest(`${service.name} Health`, false, `Status: ${response?.status || 'No response'}`, duration);
    }
  }
}

// Test 2: User Registration
async function testRegistration() {
  console.log('\n📝 Testing User Registration...');
  
  const newUser = testUsers[1]; // Use the new user for registration
  
  // Test via API Gateway
  const { response, duration, timedOut } = await makeRequest({
    method: 'POST',
    url: `${API_GATEWAY_URL}/api/register`,
    data: newUser,
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (timedOut) {
    logTest('Registration via API Gateway', false, 'Request timed out', duration);
  } else if (response && response.status === 201) {
    logTest('Registration via API Gateway', true, 'User registered successfully', duration);
    console.log(`   Token: ${response.data.token?.substring(0, 20)}...`);
    console.log(`   User ID: ${response.data.user?.id}`);
  } else if (response && response.status === 409) {
    logTest('Registration via API Gateway', true, 'User already exists (expected)', duration);
  } else {
    logTest('Registration via API Gateway', false, `Status: ${response?.status}, Message: ${response?.data?.error || 'Unknown error'}`, duration);
  }
}

// Test 3: Direct Auth Service Registration (for comparison)
async function testDirectAuthRegistration() {
  console.log('\n📝 Testing Direct Auth Service Registration...');
  
  const newUser = { ...testUsers[1], email: 'direct-auth-' + testUsers[1].email };
  
  const { response, duration, timedOut } = await makeRequest({
    method: 'POST',
    url: `${AUTH_SERVICE_URL}/register`,
    data: newUser,
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (timedOut) {
    logTest('Direct Auth Registration', false, 'Request timed out', duration);
  } else if (response && response.status === 201) {
    logTest('Direct Auth Registration', true, 'User registered successfully', duration);
  } else if (response && response.status === 409) {
    logTest('Direct Auth Registration', true, 'User already exists (expected)', duration);
  } else {
    logTest('Direct Auth Registration', false, `Status: ${response?.status}, Message: ${response?.data?.error || 'Unknown error'}`, duration);
  }
}

// Test 4: User Login via API Gateway
async function testLoginViaGateway() {
  console.log('\n🔐 Testing Login via API Gateway...');
  
  const loginUser = testUsers[0]; // Use existing user
  
  const { response, duration, timedOut } = await makeRequest({
    method: 'POST',
    url: `${API_GATEWAY_URL}/api/login`,
    data: loginUser,
    headers: { 'Content-Type': 'application/json' }
  }, 15000); // Longer timeout for debugging
  
  if (timedOut) {
    logTest('Login via API Gateway', false, 'Request timed out - this is the reported issue!', duration);
  } else if (response && response.status === 200) {
    logTest('Login via API Gateway', true, 'Login successful', duration);
    console.log(`   Token: ${response.data.token?.substring(0, 20)}...`);
    console.log(`   User ID: ${response.data.user?.id}`);
  } else {
    logTest('Login via API Gateway', false, `Status: ${response?.status}, Message: ${response?.data?.error || 'Unknown error'}`, duration);
  }
}

// Test 5: Direct Auth Service Login (for comparison)
async function testDirectAuthLogin() {
  console.log('\n🔐 Testing Direct Auth Service Login...');
  
  const loginUser = testUsers[0];
  
  const { response, duration, timedOut } = await makeRequest({
    method: 'POST',
    url: `${AUTH_SERVICE_URL}/login`,
    data: loginUser,
    headers: { 'Content-Type': 'application/json' }
  }, 15000);
  
  if (timedOut) {
    logTest('Direct Auth Login', false, 'Request timed out', duration);
  } else if (response && response.status === 200) {
    logTest('Direct Auth Login', true, 'Login successful', duration);
    console.log(`   Token: ${response.data.token?.substring(0, 20)}...`);
  } else {
    logTest('Direct Auth Login', false, `Status: ${response?.status}, Message: ${response?.data?.error || 'Unknown error'}`, duration);
  }
}

// Test 6: User Service Direct Access
async function testUserServiceDirectAccess() {
  console.log('\n👤 Testing User Service Direct Access...');
  
  const email = testUsers[0].email;
  
  const { response, duration, timedOut } = await makeRequest({
    method: 'GET',
    url: `${USER_SERVICE_URL}/users/by-email/${email}`,
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (timedOut) {
    logTest('User Service Direct Access', false, 'Request timed out', duration);
  } else if (response && response.status === 200) {
    logTest('User Service Direct Access', true, 'User found successfully', duration);
    console.log(`   User ID: ${response.data.id}`);
    console.log(`   Email: ${response.data.email}`);
  } else {
    logTest('User Service Direct Access', false, `Status: ${response?.status}, Message: ${response?.data?.error || 'Unknown error'}`, duration);
  }
}

// Test 7: Token Verification
async function testTokenVerification() {
  console.log('\n🔍 Testing Token Verification...');
  
  // First, try to get a token
  const { response: loginResponse } = await makeRequest({
    method: 'POST',
    url: `${AUTH_SERVICE_URL}/login`,
    data: testUsers[0],
    headers: { 'Content-Type': 'application/json' }
  }, 5000);
  
  if (loginResponse && loginResponse.status === 200 && loginResponse.data.token) {
    const token = loginResponse.data.token;
    
    const { response, duration, timedOut } = await makeRequest({
      method: 'POST',
      url: `${AUTH_SERVICE_URL}/verify`,
      data: { token },
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (timedOut) {
      logTest('Token Verification', false, 'Request timed out', duration);
    } else if (response && response.status === 200 && response.data.valid) {
      logTest('Token Verification', true, 'Token is valid', duration);
    } else {
      logTest('Token Verification', false, `Status: ${response?.status}, Valid: ${response?.data?.valid}`, duration);
    }
  } else {
    logTest('Token Verification', false, 'Could not get token for verification test');
  }
}

// Test 8: Invalid Login Attempts
async function testInvalidLogin() {
  console.log('\n🚫 Testing Invalid Login Attempts...');
  
  const invalidAttempts = [
    { email: 'nonexistent@test.com', password: 'password123', expectStatus: 401 },
    { email: testUsers[0].email, password: 'wrongpassword', expectStatus: 401 },
    { email: 'invalid-email', password: 'password123', expectStatus: 400 }
  ];
  
  for (let i = 0; i < invalidAttempts.length; i++) {
    const attempt = invalidAttempts[i];
    const { response, duration, timedOut } = await makeRequest({
      method: 'POST',
      url: `${API_GATEWAY_URL}/api/login`,
      data: { email: attempt.email, password: attempt.password },
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (timedOut) {
      logTest(`Invalid Login ${i + 1}`, false, 'Request timed out', duration);
    } else if (response && response.status === attempt.expectStatus) {
      logTest(`Invalid Login ${i + 1}`, true, `Correctly rejected with status ${response.status}`, duration);
    } else {
      logTest(`Invalid Login ${i + 1}`, false, `Expected status ${attempt.expectStatus}, got ${response?.status}`, duration);
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Authentication API Tests...');
  console.log('=' * 60);
  
  const startTime = Date.now();
  
  try {
    await testServiceHealth();
    await testRegistration();
    await testDirectAuthRegistration();
    await testUserServiceDirectAccess();
    await testDirectAuthLogin();
    await testLoginViaGateway(); // This should reveal the hanging issue
    await testTokenVerification();
    await testInvalidLogin();
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  console.log('\n' + '=' * 60);
  console.log('📊 TEST SUMMARY');
  console.log('=' * 60);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏱️ Total Time: ${totalTime}ms`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.testName}: ${t.message}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. If login via gateway times out, check API gateway routing');
  console.log('   2. If direct auth login works but gateway fails, check proxy configuration');
  console.log('   3. If all auth service calls timeout, check auth service logs');
  console.log('   4. Check Docker network connectivity between services');
}

// Export for potential module use
module.exports = {
  runAllTests,
  testServiceHealth,
  testRegistration,
  testLoginViaGateway,
  testDirectAuthLogin
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
} 