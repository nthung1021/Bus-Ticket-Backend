#!/usr/bin/env node
/**
 * Find PayOS order code by bookingId and POST a simulated webhook.
 * Usage: node scripts/trigger-webhook-for-booking.js <bookingId> [--success] [--backend=http://localhost:3000]
 */
const { Client } = require('pg');
const fetch = globalThis.fetch || require('node-fetch');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Usage: node scripts/trigger-webhook-for-booking.js <bookingId> [--success] [--backend=http://localhost:3000]');
    process.exit(1);
  }

  const bookingId = argv[0];
  const success = argv.includes('--success');
  const backendArg = argv.find(a => a.startsWith('--backend='));
  const backendUrl = (backendArg && backendArg.split('=')[1]) || process.env.BACKEND_URL || 'http://localhost:3000';

  // DB connection from env or defaults
  const dbUrl = process.env.DATABASE_URL;
  // Coerce env values to strings to avoid pg SASL errors when env vars are non-strings
  const clientConfig = dbUrl
    ? { connectionString: String(dbUrl) }
    : {
        host: String(process.env.PGHOST || 'localhost'),
        port: Number(process.env.PGPORT) || 5432,
        database: String(process.env.PGDATABASE || process.env.DB_NAME || 'bus_booking'),
        user: String(process.env.PGUSER || process.env.DB_USER || 'postgres'),
        password: process.env.PGPASSWORD !== undefined
          ? String(process.env.PGPASSWORD)
          : process.env.DB_PASS !== undefined
            ? String(process.env.DB_PASS)
            : '',
      };

  if (!clientConfig.connectionString && !clientConfig.password) {
    console.warn('Warning: No DB password provided. If your Postgres requires authentication this may fail.');
  }

  const client = new Client(clientConfig);
  try {
    await client.connect();

    const res = await client.query(
      `SELECT payos_order_code, id, amount FROM payments WHERE booking_id = $1 ORDER BY processed_at DESC LIMIT 1`,
      [bookingId]
    );

    if (res.rowCount === 0) {
      console.error('No payment record found for booking', bookingId);
      process.exit(2);
    }

    const row = res.rows[0];
    const orderCode = row.payos_order_code;
    const amount = row.amount || 2000;

    if (!orderCode) {
      console.error('Payment record has no payos_order_code for booking', bookingId);
      process.exit(3);
    }

    const payload = {
      orderCode: Number(orderCode),
      amount,
      description: `Simulated payment for booking ${bookingId}`,
      code: success ? '00' : '99',
      desc: success ? 'Payment successful (simulated)' : 'Payment failed (simulated)'
    };

    const url = `${backendUrl.replace(/\/$/, '')}/payos/webhook`;
    console.log(`Posting simulated webhook to ${url} with payload:`, payload);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    console.log('Response status:', resp.status);
    console.log('Response body:', text);
  } catch (err) {
    console.error('Error:', err);
    process.exit(4);
  } finally {
    try { await client.end(); } catch (_) {}
  }
}

main();
