import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMissingColumnsts1766830730881 implements MigrationInterface {
    name = 'AddMissingColumnsts1766830730881'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_last_modified_at"`);
        await queryRunner.query(`ALTER TABLE "seat_status" DROP COLUMN "seat_code"`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "user_id" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "title" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "message" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "type" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "data" jsonb`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "expires_at" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "booking_id" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_status_expires_at" ON "bookings" ("status", "expires_at") `);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741"`);
        await queryRunner.query(`DROP INDEX "public"."idx_bookings_status_expires_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "booking_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_3f5c2196c2b2af99a4697e51741" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "expires_at"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "data"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "message"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "user_id"`);
        await queryRunner.query(`ALTER TABLE "seat_status" ADD "seat_code" character varying`);
        await queryRunner.query(`CREATE INDEX "idx_bookings_last_modified_at" ON "bookings" ("last_modified_at") `);
    }
}
