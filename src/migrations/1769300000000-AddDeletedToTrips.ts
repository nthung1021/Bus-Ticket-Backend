import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedToTrips1769300000000 implements MigrationInterface {
  name = 'AddDeletedToTrips1769300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "deleted" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_trips_deleted" ON "trips" ("deleted")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_trips_deleted"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "deleted"`);
  }
}
