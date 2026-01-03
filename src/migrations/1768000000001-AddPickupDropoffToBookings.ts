import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPickupDropoffToBookings1768000000001 implements MigrationInterface {
    name = 'AddPickupDropoffToBookings1768000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_point_id" uuid`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dropoff_point_id" uuid`);

        // Create indexes for quick lookups
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_pickup_point" ON "bookings" ("pickup_point_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_dropoff_point" ON "bookings" ("dropoff_point_id")`);

        // Add foreign key constraints if route_points table exists
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_points') THEN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_pickup_point') THEN
                        ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_pickup_point" FOREIGN KEY ("pickup_point_id") REFERENCES "route_points"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_dropoff_point') THEN
                        ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_dropoff_point" FOREIGN KEY ("dropoff_point_id") REFERENCES "route_points"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                    END IF;
                END IF;
            END;
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_bookings_pickup_point"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_bookings_dropoff_point"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_pickup_point"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_dropoff_point"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pickup_point_id"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "dropoff_point_id"`);
    }

}
