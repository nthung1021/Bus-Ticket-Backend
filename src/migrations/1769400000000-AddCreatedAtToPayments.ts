import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedAtToPayments1769400000000 implements MigrationInterface {
  name = 'AddCreatedAtToPayments1769400000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the created_at column with a default value, then backfill from processed_at when available,
    // and finally enforce NOT NULL to keep column consistent.
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()`);
    await queryRunner.query(`UPDATE "payments" SET "created_at" = "processed_at" WHERE "created_at" IS NULL AND "processed_at" IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "created_at" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "created_at"`);
  }
}
