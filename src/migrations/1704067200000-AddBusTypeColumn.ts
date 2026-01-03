import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusTypeColumn1704067200000 implements MigrationInterface {
    name = 'AddBusTypeColumn1704067200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type if it doesn't already exist (safe/ idempotent)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'buses_bus_type_enum') THEN
                    CREATE TYPE "public"."buses_bus_type_enum" AS ENUM('standard', 'limousine', 'sleeper', 'seater', 'vip', 'business');
                END IF;
            END;
            $$;
        `);

        // Add the busType column with default value, if not exists
        await queryRunner.query(`ALTER TABLE "buses" ADD COLUMN IF NOT EXISTS "bus_type" "public"."buses_bus_type_enum" NOT NULL DEFAULT 'standard'`);

        // Create index for better performance (if not exists)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_buses_bus_type" ON "buses" ("bus_type")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the index if exists
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_buses_bus_type"`);

        // Drop the column if exists
        await queryRunner.query(`ALTER TABLE "buses" DROP COLUMN IF EXISTS "bus_type"`);

        // Drop the enum type if exists and no longer used
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'buses_bus_type_enum') THEN
                    -- Only drop if there are no dependent objects using the type
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_depend d
                        JOIN pg_type t ON d.refobjid = t.oid
                        WHERE t.typname = 'buses_bus_type_enum'
                          AND d.deptype = 'n'
                    ) THEN
                        DROP TYPE IF EXISTS "public"."buses_bus_type_enum";
                    END IF;
                END IF;
            END;
            $$;
        `);
    }
}