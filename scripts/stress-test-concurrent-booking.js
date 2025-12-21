#!/usr/bin/env node

/**
 * Concurrent Booking Stress Test Script
 * 
 * This script simulates multiple concurrent users trying to book the same seats
 * to validate the distributed locking mechanism prevents double bookings.
 * 
 * Usage:
 *   node stress-test-concurrent-booking.js
 * 
 * Environment Variables:
 *   API_BASE_URL - Backend API URL (default: http://localhost:3000)
 *   CONCURRENT_USERS - Number of concurrent requests (default: 10)
 *   AUTH_TOKEN - JWT token for authenticated requests (optional)
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 10,
  authToken: process.env.AUTH_TOKEN || null,
  tripId: process.env.TRIP_ID || 'test-trip-123',
  testTimeoutMs: 30000, // 30 seconds timeout
};

// Test data
const SEAT_COMBINATIONS = [
  { seats: [{ code: 'A1' }, { code: 'A2' }], passengers: [
    { fullName: 'Test User 1A', documentId: 'ID001A', seatCode: 'A1' },
    { fullName: 'Test User 2A', documentId: 'ID002A', seatCode: 'A2' }
  ]},
  { seats: [{ code: 'B1' }, { code: 'B2' }], passengers: [
    { fullName: 'Test User 1B', documentId: 'ID001B', seatCode: 'B1' },
    { fullName: 'Test User 2B', documentId: 'ID002B', seatCode: 'B2' }
  ]},
  { seats: [{ code: 'C1' }], passengers: [
    { fullName: 'Test User 1C', documentId: 'ID001C', seatCode: 'C1' }
  ]},
];

// HTTP request helper
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const httpModule = options.protocol === 'https:' ? https : http;
    const startTime = Date.now();
    
    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData,
            responseTime,
            timestamp: new Date().toISOString()
          });
        } catch (parseError) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime,
            timestamp: new Date().toISOString(),
            parseError: parseError.message
          });
        }
      });
    });

    req.on('error', (error) => {
      const endTime = Date.now();
      reject({
        error: error.message,
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString()
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        responseTime: CONFIG.testTimeoutMs,
        timestamp: new Date().toISOString()
      });
    });

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.setTimeout(CONFIG.testTimeoutMs);
    req.end();
  });
}

// Create booking request
async function createBooking(userId, seatCombination) {
  const url = new URL(`${CONFIG.baseUrl}/api/booking`);
  
  const bookingData = {
    tripId: CONFIG.tripId,
    seats: seatCombination.seats,
    passengers: seatCombination.passengers,
    totalPrice: seatCombination.seats.length * 50, // $50 per seat
    isGuestCheckout: !CONFIG.authToken,
    contactEmail: !CONFIG.authToken ? `test${userId}@example.com` : undefined,
    contactPhone: !CONFIG.authToken ? `+123456789${userId.toString().padStart(2, '0')}` : undefined
  };

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    protocol: url.protocol,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': `StressTest/1.0 (User-${userId})`,
      ...(CONFIG.authToken && { 'Authorization': `Bearer ${CONFIG.authToken}` })
    }
  };

  try {
    const response = await makeRequest(options, bookingData);
    return {
      userId,
      success: response.statusCode >= 200 && response.statusCode < 300,
      statusCode: response.statusCode,
      data: response.data,
      responseTime: response.responseTime,
      timestamp: response.timestamp,
      seatCodes: seatCombination.seats.map(s => s.code).join(',')
    };
  } catch (error) {
    return {
      userId,
      success: false,
      error: error.error || error.message,
      responseTime: error.responseTime,
      timestamp: error.timestamp,
      seatCodes: seatCombination.seats.map(s => s.code).join(',')
    };
  }
}

// Health check
async function healthCheck() {
  const url = new URL(`${CONFIG.baseUrl}/api/health`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'GET',
    protocol: url.protocol,
    headers: {
      'User-Agent': 'StressTest/1.0 (HealthCheck)'
    }
  };

  try {
    const response = await makeRequest(options);
    return response.statusCode === 200;
  } catch (error) {
    console.error('Health check failed:', error.error || error.message);
    return false;
  }
}

// Stress test scenario 1: Same seats, multiple users
async function testConcurrentSameSeats() {
  console.log('\n🚀 Test 1: Multiple users booking the same seats');
  console.log(`Simulating ${CONFIG.concurrentUsers} users trying to book seats A1, A2 simultaneously...\n`);

  const seatCombination = SEAT_COMBINATIONS[0]; // A1, A2
  const promises = [];

  const startTime = Date.now();
  
  // Create concurrent booking requests
  for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
    promises.push(createBooking(i, seatCombination));
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const conflicts = results.filter(r => !r.success && r.statusCode === 409);
  const errors = results.filter(r => !r.success && r.statusCode !== 409);

  console.log('📊 Results Summary:');
  console.log(`   Total requests: ${results.length}`);
  console.log(`   ✅ Successful bookings: ${successful.length}`);
  console.log(`   ⚠️  Conflict responses (409): ${conflicts.length}`);
  console.log(`   ❌ Other errors: ${errors.length}`);
  console.log(`   ⏱️  Total test time: ${totalTime}ms`);
  console.log(`   📈 Average response time: ${Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)}ms`);

  // Expected: Only 1 successful booking, rest should be 409 conflicts
  const testPassed = successful.length === 1 && conflicts.length === (CONFIG.concurrentUsers - 1);
  
  console.log(`\n🎯 Test Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  if (!testPassed) {
    console.log('   Expected: 1 successful booking, rest conflicts');
    console.log(`   Actual: ${successful.length} successful, ${conflicts.length} conflicts, ${errors.length} errors`);
  }

  // Show detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : (result.statusCode === 409 ? '⚠️' : '❌');
    const statusText = result.success ? 'SUCCESS' : 
                      result.statusCode === 409 ? 'CONFLICT' : 
                      result.statusCode ? `ERROR ${result.statusCode}` : 'ERROR';
    
    console.log(`   User ${result.userId.toString().padStart(2)}: ${status} ${statusText} (${result.responseTime}ms) - ${result.seatCodes}`);
    
    if (!result.success && result.data?.message) {
      console.log(`        Message: ${result.data.message}`);
    }
    if (result.error) {
      console.log(`        Error: ${result.error}`);
    }
  });

  return { testPassed, results };
}

// Stress test scenario 2: Different seats, all should succeed
async function testConcurrentDifferentSeats() {
  console.log('\n🚀 Test 2: Users booking different seats');
  console.log('Each user books different seat combinations, all should succeed...\n');

  const promises = [];
  const userSeatMap = [];
  const startTime = Date.now();

  // Assign different seat combinations to users
  for (let i = 1; i <= Math.min(CONFIG.concurrentUsers, SEAT_COMBINATIONS.length); i++) {
    const seatCombination = SEAT_COMBINATIONS[i - 1];
    userSeatMap.push({ userId: i, seats: seatCombination.seats.map(s => s.code).join(',') });
    promises.push(createBooking(i, seatCombination));
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('📊 Results Summary:');
  console.log(`   Total requests: ${results.length}`);
  console.log(`   ✅ Successful bookings: ${successful.length}`);
  console.log(`   ❌ Failed bookings: ${failed.length}`);
  console.log(`   ⏱️  Total test time: ${totalTime}ms`);
  console.log(`   📈 Average response time: ${Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)}ms`);

  // Expected: All bookings should succeed since they're for different seats
  const testPassed = successful.length === results.length;
  
  console.log(`\n🎯 Test Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  if (!testPassed) {
    console.log('   Expected: All bookings successful (different seats)');
    console.log(`   Actual: ${successful.length} successful, ${failed.length} failed`);
  }

  // Show detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const statusText = result.success ? 'SUCCESS' : 
                      result.statusCode ? `ERROR ${result.statusCode}` : 'ERROR';
    
    console.log(`   User ${result.userId.toString().padStart(2)}: ${status} ${statusText} (${result.responseTime}ms) - ${result.seatCodes}`);
    
    if (!result.success && result.data?.message) {
      console.log(`        Message: ${result.data.message}`);
    }
    if (result.error) {
      console.log(`        Error: ${result.error}`);
    }
  });

  return { testPassed, results };
}

// Stress test scenario 3: Rapid sequential requests (idempotency test)
async function testIdempotency() {
  console.log('\n🚀 Test 3: Idempotency - Same user, same seats, rapid requests');
  console.log('Same user making multiple rapid requests for same seats...\n');

  const seatCombination = SEAT_COMBINATIONS[2]; // C1
  const rapidRequests = 5;
  const userId = 999; // Fixed user ID
  const promises = [];
  const startTime = Date.now();

  // Create rapid sequential requests from same user
  for (let i = 1; i <= rapidRequests; i++) {
    promises.push(createBooking(userId, seatCombination));
  }

  const results = await Promise.all(promises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const duplicates = results.filter(r => r.success && r.data.bookingReference);
  const conflicts = results.filter(r => !r.success && r.statusCode === 409);
  const errors = results.filter(r => !r.success && r.statusCode !== 409);

  console.log('📊 Results Summary:');
  console.log(`   Total requests: ${results.length}`);
  console.log(`   ✅ Successful responses: ${successful.length}`);
  console.log(`   🔄 Potential duplicates: ${duplicates.length}`);
  console.log(`   ⚠️  Conflicts: ${conflicts.length}`);
  console.log(`   ❌ Other errors: ${errors.length}`);
  console.log(`   ⏱️  Total test time: ${totalTime}ms`);

  // Check if multiple successful responses have same booking reference (idempotency)
  const bookingReferences = successful
    .map(r => r.data.bookingReference)
    .filter(ref => ref);
  const uniqueReferences = new Set(bookingReferences);

  console.log(`   🆔 Unique booking references: ${uniqueReferences.size}`);
  
  // Expected: Either 1 successful booking + conflicts, or multiple successful with same reference (idempotency)
  const testPassed = uniqueReferences.size <= 1;
  
  console.log(`\n🎯 Test Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  if (!testPassed) {
    console.log('   Expected: All successful bookings should have same reference (idempotency)');
    console.log(`   Actual: ${uniqueReferences.size} unique references found`);
  }

  // Show booking references
  if (uniqueReferences.size > 0) {
    console.log(`\n🎫 Booking References: ${[...uniqueReferences].join(', ')}`);
  }

  return { testPassed, results };
}

// Main test runner
async function runStressTests() {
  console.log('🧪 Concurrent Booking System Stress Test');
  console.log('=' .repeat(50));
  console.log(`🔧 Configuration:`);
  console.log(`   Base URL: ${CONFIG.baseUrl}`);
  console.log(`   Concurrent Users: ${CONFIG.concurrentUsers}`);
  console.log(`   Trip ID: ${CONFIG.tripId}`);
  console.log(`   Auth Mode: ${CONFIG.authToken ? 'Authenticated' : 'Guest Checkout'}`);
  console.log(`   Test Timeout: ${CONFIG.testTimeoutMs}ms`);

  // Health check
  console.log('\n🏥 Performing health check...');
  const isHealthy = await healthCheck();
  if (!isHealthy) {
    console.log('❌ Health check failed. Please ensure the backend is running.');
    process.exit(1);
  }
  console.log('✅ Backend is healthy');

  const testResults = [];

  try {
    // Run test scenarios
    const test1 = await testConcurrentSameSeats();
    testResults.push({ name: 'Concurrent Same Seats', passed: test1.testPassed });

    const test2 = await testConcurrentDifferentSeats();
    testResults.push({ name: 'Concurrent Different Seats', passed: test2.testPassed });

    const test3 = await testIdempotency();
    testResults.push({ name: 'Idempotency', passed: test3.testPassed });

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }

  // Final summary
  console.log('\n' + '=' .repeat(50));
  console.log('📈 FINAL TEST SUMMARY');
  console.log('=' .repeat(50));

  const passedTests = testResults.filter(t => t.passed);
  const failedTests = testResults.filter(t => !t.passed);

  testResults.forEach(test => {
    const status = test.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`   ${test.name}: ${status}`);
  });

  console.log(`\n🎯 Overall Result: ${passedTests.length}/${testResults.length} tests passed`);
  
  if (failedTests.length === 0) {
    console.log('🎉 All tests passed! Concurrent booking system is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runStressTests().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  runStressTests,
  testConcurrentSameSeats,
  testConcurrentDifferentSeats,
  testIdempotency,
  CONFIG
};