import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnDeleteCascadeToSeatStatus1767102685177 implements MigrationInterface {
    name = 'AddOnDeleteCascadeToSeatStatus1767102685177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seat_status" DROP CONSTRAINT "FK_40b48933387606c841426123cac"`);
        await queryRunner.query(`ALTER TABLE "seat_status" ADD CONSTRAINT "FK_40b48933387606c841426123cac" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seat_status" DROP CONSTRAINT "FK_40b48933387606c841426123cac"`);
        await queryRunner.query(`ALTER TABLE "seat_status" ADD CONSTRAINT "FK_40b48933387606c841426123cac" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
