import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationToUsers1769000000000 implements MigrationInterface {
  name = 'AddEmailVerificationToUsers1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use IF NOT EXISTS so this migration is idempotent if run twice or partially applied earlier
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_email_verified" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_code" character varying(6)`);
    await queryRunner.query(`-- If column exists with wrong type, coerce it to varchar(6)
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verification_code' AND data_type <> 'character varying'
      ) THEN
        ALTER TABLE "users" ALTER COLUMN "email_verification_code" TYPE character varying(6) USING ("email_verification_code"::character varying);
      END IF;
    END$$;
    `);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_expires_at" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verification_expires_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verification_code"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "is_email_verified"`);
  }
}
