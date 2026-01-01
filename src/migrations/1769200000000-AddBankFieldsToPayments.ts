import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankFieldsToPayments1769200000000 implements MigrationInterface {
  name = 'AddBankFieldsToPayments1769200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use IF NOT EXISTS to make the migration idempotent if run twice
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "bank_id" character varying`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "bank_number" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "bank_number"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "bank_id"`);
  }
}
