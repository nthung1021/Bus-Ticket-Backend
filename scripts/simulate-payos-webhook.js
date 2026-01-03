#!/usr/bin/env node
/**
 * Simulate PayOS webhook for local testing.
 * Usage: node scripts/simulate-payos-webhook.js <orderCode> [--success]
 * Example: node scripts/simulate-payos-webhook.js 12345 --success
 */
const fetch = globalThis.fetch || require('node-fetch');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error('Usage: node scripts/simulate-payos-webhook.js <orderCode> [--success]');
    process.exit(1);
  }

  const orderCode = Number(argv[0]);
  const success = argv.includes('--success');

  const payload = {
    orderCode,
    amount: 2000,
    description: 'Simulated payment',
    code: success ? '00' : '99',
    desc: success ? 'Payment successful (simulated)' : 'Payment failed (simulated)'
  };

  const url = process.env.BACKEND_URL || 'http://localhost:3000/payos/webhook';

  console.log(`Sending simulated webhook to ${url} with payload:`, payload);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('Response status:', res.status);
    console.log('Response body:', text);
  } catch (err) {
    console.error('Failed to send webhook:', err);
    process.exit(2);
  }
}

main();
