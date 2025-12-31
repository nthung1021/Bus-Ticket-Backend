import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationToUsers1769000000000 implements MigrationInterface {
  name = 'AddEmailVerificationToUsers1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "is_email_verified" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "email_verification_code" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "email_verification_expires_at" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verification_expires_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verification_code"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_email_verified"`);
  }
}
