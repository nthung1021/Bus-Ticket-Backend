import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReviewsTable1734766335000 implements MigrationInterface {
    name = 'CreateReviewsTable1734766335000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if reviews table already exists
        const tableExists = await queryRunner.hasTable("reviews");
        
        if (!tableExists) {
            // Create reviews table with all required fields and constraints
            await queryRunner.query(`
                CREATE TABLE "reviews" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "user_id" uuid NOT NULL,
                    "trip_id" uuid NOT NULL,
                    "booking_id" uuid NOT NULL,
                    "rating" integer NOT NULL,
                    "comment" text,
                    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_reviews_id" PRIMARY KEY ("id"),
                    CONSTRAINT "UQ_booking_review" UNIQUE ("booking_id"),
                    CONSTRAINT "FK_reviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT "FK_reviews_trip_id" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT "FK_reviews_booking_id" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                    CONSTRAINT "CHK_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
                )
            `);

            // Create indexes for performance optimization
            await queryRunner.query(`CREATE INDEX "idx_reviews_user_id" ON "reviews" ("user_id")`);
            await queryRunner.query(`CREATE INDEX "idx_reviews_trip_id" ON "reviews" ("trip_id")`);
            await queryRunner.query(`CREATE INDEX "idx_reviews_rating" ON "reviews" ("rating")`);
            await queryRunner.query(`CREATE INDEX "idx_reviews_created_at" ON "reviews" ("created_at")`);
        } else {
            // Table exists, just ensure indexes exist
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_user_id" ON "reviews" ("user_id")`);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_trip_id" ON "reviews" ("trip_id")`);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_rating" ON "reviews" ("rating")`);
            await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_created_at" ON "reviews" ("created_at")`);
        }
        
        // Ensure additional indexes exist
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_user_id_single" ON "reviews" ("user_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_trip_id_single" ON "reviews" ("trip_id")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_booking_id" ON "reviews" ("booking_id")`);
        
        // Add comment to table
        await queryRunner.query(`COMMENT ON TABLE "reviews" IS 'Customer reviews for completed bookings - ensures 1 booking = 1 review maximum'`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."rating" IS 'Rating from 1 to 5 stars'`);
        await queryRunner.query(`COMMENT ON COLUMN "reviews"."comment" IS 'Optional review comment'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_booking_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_trip_id_single"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_user_id_single"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_rating"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_trip_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_user_id"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "reviews"`);
    }
}