import { MigrationInterface, QueryRunner } from "typeorm";

export class SetPickupDropoffFkOnDeleteSetNull1769000000002 implements MigrationInterface {
    name = 'SetPickupDropoffFkOnDeleteSetNull1769000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Replace existing constraints to use ON DELETE SET NULL
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_points') THEN
                    -- Drop existing constraints if present
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_pickup_point') THEN
                        ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_pickup_point";
                    END IF;
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_dropoff_point') THEN
                        ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_dropoff_point";
                    END IF;

                    -- Recreate with ON DELETE SET NULL
                    ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_pickup_point" FOREIGN KEY ("pickup_point_id") REFERENCES "route_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                    ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_dropoff_point" FOREIGN KEY ("dropoff_point_id") REFERENCES "route_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END;
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert constraints back to NO ACTION
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_points') THEN
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_pickup_point') THEN
                        ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_pickup_point";
                    END IF;
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_bookings_dropoff_point') THEN
                        ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_dropoff_point";
                    END IF;

                    ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_pickup_point" FOREIGN KEY ("pickup_point_id") REFERENCES "route_points"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                    ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_dropoff_point" FOREIGN KEY ("dropoff_point_id") REFERENCES "route_points"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END;
            $$;
        `);
    }
}
