import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFacebookIdToUsers1766353634464 implements MigrationInterface {
    name = 'AddFacebookIdToUsers1766353634464'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_user_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_trip_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_booking_id"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "chk_rating_range"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "payos_order_code" integer`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "user_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "title" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "message" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "type" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "data" jsonb`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "last_modified_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "facebookId" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_f9740e1e654a5daddb82c60bd75" UNIQUE ("facebookId")`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS 'Rating from 1 to 5 stars'`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS 'Optional review comment'`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "booking_id" DROP NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS 'Rating from 1 to 5 stars'`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS 'Optional review comment'`);
        await queryRunner.query(`CREATE INDEX "idx_reviews_user_id_single" ON "reviews" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_reviews_trip_id_single" ON "reviews" ("trip_id") `);
        await queryRunner.query(`CREATE INDEX "idx_bookings_status_expires_at" ON "bookings" ("status", "expires_at") `);
        await queryRunner.query(`CREATE INDEX "idx_users_facebook_id" ON "users" ("facebookId") `);
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
        await queryRunner.query(`DROP INDEX "public"."idx_users_facebook_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_status_expires_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_trip_id_single"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reviews_user_id_single"`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "booking_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_f9740e1e654a5daddb82c60bd75"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "facebookId"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "expires_at"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "last_modified_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "data"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "message"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "payos_order_code"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "chk_rating_range" CHECK (((rating >= 1) AND (rating <= 5)))`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_booking_id" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_trip_id" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
