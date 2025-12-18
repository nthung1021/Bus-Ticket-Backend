import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpiresAtToBookings1734347925000 implements MigrationInterface {
    name = 'AddExpiresAtToBookings1734347925000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add expires_at column to bookings table
        await queryRunner.query(`
            ALTER TABLE "bookings" 
            ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP WITH TIME ZONE
        `);

        // Create index for status + expires_at for efficient querying of expired bookings
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_bookings_status_expires_at" 
            ON "bookings" ("status", "expires_at")
        `);

        // Update existing pending bookings with expiration time (15 minutes from booked_at)
        await queryRunner.query(`
            UPDATE "bookings" 
            SET "expires_at" = "booked_at" + INTERVAL '15 minutes' 
            WHERE "status" = 'pending' AND "expires_at" IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the index
        await queryRunner.query(`
            DROP INDEX "idx_bookings_status_expires_at"
        `);

        // Drop the expires_at column
        await queryRunner.query(`
            ALTER TABLE "bookings" 
            DROP COLUMN "expires_at"
        `);
    }
}