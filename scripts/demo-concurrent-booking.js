#!/usr/bin/env node

/**
 * Quick Demo of Concurrent Booking System
 * 
 * This script demonstrates the concurrent booking protection
 * by simulating multiple users trying to book the same seats.
 */

const { runStressTests } = require('./stress-test-concurrent-booking');

console.log('🚌 Bus Ticket Concurrent Booking Demo');
console.log('=====================================');
console.log('');
console.log('This demo shows how the system handles concurrent booking requests:');
console.log('');
console.log('📋 What we\'ll test:');
console.log('  1. Multiple users trying to book the same seats (conflict prevention)');
console.log('  2. Users booking different seats (all should succeed)');
console.log('  3. Same user making rapid requests (idempotency)');
console.log('');
console.log('🔧 Requirements:');
console.log('  - Backend running on http://localhost:3000');
console.log('  - Database with trip and seat data');
console.log('');
console.log('⚠️  Note: This will make actual booking requests to your backend');
console.log('');

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Continue with the demo? (y/n): ', (answer) => {
  rl.close();
  
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('');
    console.log('🚀 Starting concurrent booking demo...');
    console.log('');
    
    // Override config for demo
    const originalConfig = require('./stress-test-concurrent-booking').CONFIG;
    originalConfig.concurrentUsers = 5; // Smaller demo
    
    runStressTests()
      .then(() => {
        console.log('');
        console.log('✅ Demo completed successfully!');
        console.log('');
        console.log('Key takeaways:');
        console.log('  • Only one user can book the same seats (distributed locking)');
        console.log('  • Different seats can be booked simultaneously');
        console.log('  • Duplicate requests return the same booking (idempotency)');
        console.log('  • Conflicts return HTTP 409 with helpful error messages');
      })
      .catch((error) => {
        console.log('');
        console.log('❌ Demo failed:', error.message);
        console.log('');
        console.log('Common issues:');
        console.log('  • Backend not running on http://localhost:3000');
        console.log('  • Missing trip/seat test data in database');
        console.log('  • Database connection issues');
        console.log('  • Network connectivity problems');
      });
  } else {
    console.log('');
    console.log('Demo cancelled. Run again when ready!');
    process.exit(0);
  }
});