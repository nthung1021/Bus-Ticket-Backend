import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BookingMigrationService } from '../booking/booking-migration.service';

async function runBookingMigration() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const migrationService = app.get(BookingMigrationService);

  console.log('Starting booking reference migration...');
  try {
    await migrationService.generateMissingBookingReferences();
    console.log('✅ Booking reference migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runBookingMigration();