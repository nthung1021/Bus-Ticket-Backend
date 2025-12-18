import { AppDataSource } from '../data-source';

async function createTable() {
  try {
    await AppDataSource.initialize();
    console.log('Data Source has been initialized!');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('Creating booking_modification_history table...');

    // Check if enum exists
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_modification_history_modification_type_enum');
    `);

    if (!enumExists[0].exists) {
      await queryRunner.query(`
        CREATE TYPE "public"."booking_modification_history_modification_type_enum" AS ENUM('passenger_info', 'seat_change', 'contact_info');
      `);
      console.log('Created enum type.');
    }

    // Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_modification_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
        "booking_id" uuid NOT NULL, 
        "user_id" uuid, 
        "modification_type" "public"."booking_modification_history_modification_type_enum" NOT NULL, 
        "description" text NOT NULL, 
        "changes" jsonb, 
        "previousValues" jsonb, 
        "modified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), 
        CONSTRAINT "PK_ef0cd664b4d69c6197502cbc8fb" PRIMARY KEY ("id")
      );
    `);
    console.log('Created table booking_modification_history.');

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_booking_id" ON "booking_modification_history" ("booking_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_type" ON "booking_modification_history" ("modification_type");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_user" ON "booking_modification_history" ("user_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_booking" ON "booking_modification_history" ("booking_id");`);
    console.log('Created indexes.');

    // Add foreign keys
    try {
      await queryRunner.query(`
        ALTER TABLE "booking_modification_history" 
        ADD CONSTRAINT "FK_e4ad68fb61eb534643227fc2ef1" 
        FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") 
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
      console.log('Added foreign key for booking_id.');
    } catch (e) {
      console.log('Foreign key for booking_id might already exist or failed:', e.message);
    }

    try {
      await queryRunner.query(`
        ALTER TABLE "booking_modification_history" 
        ADD CONSTRAINT "FK_a27455dcc3340201583bc7491a6" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") 
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
      console.log('Added foreign key for user_id.');
    } catch (e) {
      console.log('Foreign key for user_id might already exist or failed:', e.message);
    }

    await queryRunner.release();
    await AppDataSource.destroy();
    console.log('Table creation complete!');
  } catch (err) {
    console.error('Error during table creation:', err);
  }
}

createTable();
