import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePassengerDocumentNullable1768000000000 implements MigrationInterface {
  name = 'MakePassengerDocumentNullable1768000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "passenger_details" ALTER COLUMN "document_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "passenger_details" ALTER COLUMN "document_id" SET NOT NULL`);
  }
}
