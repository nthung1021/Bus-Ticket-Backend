#!/usr/bin/env node

/**
 * Script to run the fixed seed data
 * This replaces the original seed with real-world compliant data
 */

import { seedDatabase } from './seed-database-fixed';

async function main() {
  console.log('🚀 Starting database seeding with FIXED real-world data...\n');
  
  try {
    await seedDatabase();
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('📝 The database now contains realistic Vietnamese bus booking data');
    console.log('✅ All real-world constraints are satisfied');
    console.log('🧪 Ready for testing and analytics queries\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}