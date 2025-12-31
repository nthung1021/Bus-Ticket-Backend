import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1765773826067 implements MigrationInterface {
    name = 'InitialSchema1765773826067'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_seat_status_trip_state"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_seat_layouts_capacity"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_routes_analytics_covering"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_trips_departure_route"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_trips_route_bus_departure"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_trips_departure_bus"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_trips_date_route_analytics"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_trips_active_recent"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_contact_email"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_contact_phone"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_last_modified_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_booking_reference_unique"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_booked_at_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_status_amount_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_trip_status_date"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_analytics_composite"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_summary_covering"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_date_status_analytics"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_paid_recent"`);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_modification_history_modification_type_enum') THEN
                    CREATE TYPE "public"."booking_modification_history_modification_type_enum" AS ENUM('passenger_info', 'seat_change', 'contact_info');
                END IF;
            END;
            $$;
        `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "booking_modification_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "booking_id" uuid NOT NULL, "user_id" uuid, "modification_type" "public"."booking_modification_history_modification_type_enum" NOT NULL, "description" text NOT NULL, "changes" jsonb, "previousValues" jsonb, "modified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ef0cd664b4d69c6197502cbc8fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_booking_id" ON "booking_modification_history" ("booking_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_type" ON "booking_modification_history" ("modification_type") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_user" ON "booking_modification_history" ("user_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_modification_history_booking" ON "booking_modification_history" ("booking_id") `);
        await queryRunner.query(`ALTER TABLE "seat_status" ADD COLUMN IF NOT EXISTS "seat_code" character varying`);
        await queryRunner.query(`UPDATE "seat_status" SET "seat_code" = 'SEAT-' || "id" WHERE "seat_code" IS NULL`);
        await queryRunner.query(`ALTER TABLE "seat_status" ALTER COLUMN "seat_code" SET NOT NULL`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_seat_layouts_created_at"`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" DROP COLUMN IF EXISTS "created_at"`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" DROP COLUMN IF EXISTS "updated_at"`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operators" DROP COLUMN IF EXISTS "approved_at"`);
        await queryRunner.query(`ALTER TABLE "operators" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "route_points" DROP COLUMN IF EXISTS "createdAt"`);
        await queryRunner.query(`ALTER TABLE "route_points" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "route_points" DROP COLUMN IF EXISTS "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "route_points" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN IF EXISTS "createdAt"`);
        await queryRunner.query(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN IF EXISTS "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "routes" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "feedbacks" DROP COLUMN IF EXISTS "submitted_at"`);
        await queryRunner.query(`ALTER TABLE "feedbacks" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "base_price"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "base_price" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "amount"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "processed_at"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "sent_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "sent_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "FK_64cd97487c5c42806458ab5520c"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_user_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_user_trip"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "booking_reference"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_reference" character varying NOT NULL DEFAULT 'REF-' || uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "UQ_5ba137683172608bf22d69538a0" UNIQUE ("booking_reference")`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "total_amount"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "total_amount" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_bookings_booked_at"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "booked_at"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booked_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "cancelled_at"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "payment_methods" DROP COLUMN IF EXISTS "created_at"`);
        await queryRunner.query(`ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "createdAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_users_role_created"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "created_at"`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "created_at"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_seat_layouts_created_at" ON "seat_layouts" ("created_at") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_booked_at" ON "bookings" ("booked_at") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_user_status" ON "bookings" ("user_id", "status") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_bookings_user_trip" ON "bookings" ("user_id", "trip_id") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_role_created" ON "users" ("role", "created_at") `);
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_64cd97487c5c42806458ab5520c') THEN
                    ALTER TABLE "bookings" ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END;
            $$;
        `);
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
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_64cd97487c5c42806458ab5520c"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_role_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_user_trip"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_user_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_booked_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_seat_layouts_created_at"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "idx_users_role_created" ON "users" ("created_at", "role") `);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "expiresAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "expiresAt" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payment_methods" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "payment_methods" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "cancelled_at"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "cancelled_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "booked_at"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "booked_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_booked_at" ON "bookings" ("booked_at") `);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "total_amount"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "total_amount" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "user_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "UQ_5ba137683172608bf22d69538a0"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "booking_reference"`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "booking_reference" character varying(255)`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_user_trip" ON "bookings" ("trip_id", "user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_user_status" ON "bookings" ("status", "user_id") `);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "sent_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "sent_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "processed_at"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "processed_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "amount" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "base_price"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "base_price" numeric(10,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "feedbacks" DROP COLUMN "submitted_at"`);
        await queryRunner.query(`ALTER TABLE "feedbacks" ADD "submitted_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "routes" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "routes" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "routes" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "route_points" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "route_points" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "route_points" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "route_points" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "operators" DROP COLUMN "approved_at"`);
        await queryRunner.query(`ALTER TABLE "operators" ADD "approved_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" DROP COLUMN "updated_at"`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "seat_layouts" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE INDEX "idx_seat_layouts_created_at" ON "seat_layouts" ("created_at") `);
        await queryRunner.query(`ALTER TABLE "seat_status" DROP COLUMN "seat_code"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_booking"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_modification_history_booking_id"`);
        await queryRunner.query(`DROP TABLE "booking_modification_history"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."booking_modification_history_modification_type_enum"`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_paid_recent" ON "bookings" ("booked_at", "total_amount") WHERE (status = 'paid'::bookings_status_enum)`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_date_status_analytics" ON "bookings" ("booked_at", "status") WHERE (booked_at IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_summary_covering" ON "bookings" ("booked_at", "status", "total_amount", "trip_id") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_analytics_composite" ON "bookings" ("booked_at", "status", "total_amount", "trip_id") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_trip_status_date" ON "bookings" ("booked_at", "status", "trip_id") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_status_amount_date" ON "bookings" ("booked_at", "status", "total_amount") WHERE (status = 'paid'::bookings_status_enum)`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_booked_at_status" ON "bookings" ("booked_at", "status") WHERE (booked_at IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_booking_reference_unique" ON "bookings" ("booking_reference") WHERE (booking_reference IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_last_modified_at" ON "bookings" ("last_modified_at") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_contact_phone" ON "bookings" ("contact_phone") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_contact_email" ON "bookings" ("contact_email") `);
        await queryRunner.query(`CREATE INDEX "idx_trips_active_recent" ON "trips" ("departure_time", "route_id") `);
        await queryRunner.query(`CREATE INDEX "idx_trips_date_route_analytics" ON "trips" ("departure_time", "route_id") WHERE (departure_time IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_trips_departure_bus" ON "trips" ("bus_id", "departure_time") WHERE (departure_time IS NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "idx_trips_route_bus_departure" ON "trips" ("bus_id", "departure_time", "route_id") `);
        await queryRunner.query(`CREATE INDEX "idx_trips_departure_route" ON "trips" ("departure_time", "route_id") WHERE ((departure_time IS NOT NULL) AND (route_id IS NOT NULL))`);
        await queryRunner.query(`CREATE INDEX "idx_routes_analytics_covering" ON "routes" ("destination", "id", "name", "origin") `);
        await queryRunner.query(`CREATE INDEX "idx_seat_layouts_capacity" ON "seat_layouts" ("bus_id", "seats_per_row", "total_rows") `);
        await queryRunner.query(`CREATE INDEX "idx_seat_status_trip_state" ON "seat_status" ("state", "trip_id") WHERE (state = 'booked'::seat_status_state_enum)`);
    }

}
