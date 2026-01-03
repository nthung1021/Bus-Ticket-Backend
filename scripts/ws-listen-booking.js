#!/usr/bin/env node
/**
 * Simple socket.io client to listen for booking websocket events.
 * Usage: node scripts/ws-listen-booking.js <bookingId>
 */
const bookingId = process.argv[2];
if (!bookingId) {
  console.error('Usage: node scripts/ws-listen-booking.js <bookingId>');
  process.exit(1);
}

async function main() {
  let io;
  try {
    io = require('socket.io-client');
  } catch (e) {
    console.error('socket.io-client not installed. Run: npm i socket.io-client');
    process.exit(2);
  }

  const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';
  const namespace = '/bookings';
  const url = `${BACKEND}${namespace}`;

  console.log(`Connecting to ${url} ...`);
  const socket = io(url, { transports: ['websocket'], reconnectionAttempts: 5 });

  socket.on('connect', () => {
    console.log('Connected, socket id:', socket.id);
    // Ask server to track booking
    socket.emit('trackBooking', { bookingId }, (ack) => {
      console.log('trackBooking ack:', ack);
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('bookingStatusUpdated', (data) => {
    console.log('bookingStatusUpdated:', data);
  });

  socket.on('paymentStatusUpdated', (data) => {
    console.log('paymentStatusUpdated:', data);
  });

  // Generic logging for any event
  const eventsToLog = ['bookingCreated', 'bookingCancelled', 'bookingStatus', 'bookingStatusUpdated', 'paymentStatusUpdated'];
  eventsToLog.forEach((ev) => socket.on(ev, (d) => console.log(ev, d)));

  // Keep process alive
  process.stdin.resume();
}

main();
