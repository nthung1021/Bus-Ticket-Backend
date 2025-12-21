import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompletedBookingStatusAndTripRating1766285709612 implements MigrationInterface {
    name = 'AddCompletedBookingStatusAndTripRating1766285709612'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_user_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_trip_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_booking_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "chk_rating_range"`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "average_rating" numeric(3,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "trips" ADD "review_count" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "payos_order_code" integer`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "user_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "title" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "message" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "type" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "data" jsonb`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "last_modified_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS 'Rating from 1 to 5 stars'`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS 'Optional review comment'`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "booking_id" DROP NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_user_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_trip_status"`);
        await queryRunner.query(`ALTER TYPE "public"."bookings_status_enum" RENAME TO "bookings_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('pending', 'paid', 'completed', 'cancelled', 'expired')`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum" USING "status"::"text"::"public"."bookings_status_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum_old"`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS 'Rating from 1 to 5 stars'`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS 'Optional review comment'`);
        await queryRunner.query(`CREATE INDEX "idx_reviews_user_id_single" ON "reviews" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_reviews_trip_id_single" ON "reviews" ("trip_id") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_status_expires_at" ON "bookings" ("status", "expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_user_status" ON "bookings" ("user_id", "status") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_trip_status" ON "bookings" ("trip_id", "status") `);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_362e169dcc383ce7bb4ddf021ff" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_362e169dcc383ce7bb4ddf021ff"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_trip_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_user_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_status_expires_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_trip_id_single"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_user_id_single"`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS NULL`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum_old" AS ENUM('pending', 'paid', 'cancelled', 'expired')`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum_old" USING "status"::"text"::"public"."bookings_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."bookings_status_enum_old" RENAME TO "bookings_status_enum"`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_trip_status" ON "bookings" ("status", "trip_id") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_user_status" ON "bookings" ("status", "user_id") `);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "booking_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS NULL`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "expires_at"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "last_modified_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "data"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "message"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "payos_order_code"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "review_count"`);
        await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN "average_rating"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "chk_rating_range" CHECK (((rating >= 1) AND (rating <= 5)))`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_booking_id" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_trip_id" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
