import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBookingModificationHistory1766039100000 implements MigrationInterface {
    name = 'AddBookingModificationHistory1766039100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if enum exists
        const enumExists = await queryRunner.query(`
            SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_modification_history_modification_type_enum');
        `);

        if (!enumExists[0].exists) {
            await queryRunner.query(`CREATE TYPE "public"."booking_modification_history_modification_type_enum" AS ENUM('passenger_info', 'seat_change', 'contact_info')`);
        }

        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "booking_modification_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "user_id" uuid, "modification_type" "public"."booking_modification_history_modification_type_enum" NOT NULL, "description" text NOT NULL, "changes" jsonb, "previousValues" jsonb, "modified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ef0cd664b4d69c6197502cbc8fb" PRIMARY KEY ("id"))`);
        
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_booking_id" ON "booking_modification_history" ("booking_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_type" ON "booking_modification_history" ("modification_type") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_user" ON "booking_modification_history" ("user_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_booking" ON "booking_modification_history" ("booking_id") `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_e4ad68fb61eb534643227fc2ef1') THEN
                    ALTER TABLE "booking_modification_history" ADD CONSTRAINT "FK_e4ad68fb61eb534643227fc2ef1" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END;
            $$;
        `);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_a27455dcc3340201583bc7491a6') THEN
                    ALTER TABLE "booking_modification_history" ADD CONSTRAINT "FK_a27455dcc3340201583bc7491a6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END;
            $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "booking_modification_history" DROP CONSTRAINT "FK_a27455dcc3340201583bc7491a6"`);
        await queryRunner.query(`ALTER TABLE "booking_modification_history" DROP CONSTRAINT "FK_e4ad68fb61eb534643227fc2ef1"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_booking"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_booking_id"`);
        await queryRunner.query(`DROP TABLE "booking_modification_history"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_modification_history_modification_type_enum"`);
    }

}
