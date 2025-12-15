import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactInfoToBooking1734567890125 implements MigrationInterface {
  name = 'AddContactInfoToBooking1734567890125';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add contact_email and contact_phone columns to bookings table
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      ADD COLUMN IF NOT EXISTS "contact_email" character varying,
      ADD COLUMN IF NOT EXISTS "contact_phone" character varying;
    `);

    // Add indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_contact_email" ON "bookings" ("contact_email");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_contact_phone" ON "bookings" ("contact_phone");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_contact_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_bookings_contact_phone"`);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "bookings" 
      DROP COLUMN IF EXISTS "contact_email",
      DROP COLUMN IF EXISTS "contact_phone";
    `);
  }
}