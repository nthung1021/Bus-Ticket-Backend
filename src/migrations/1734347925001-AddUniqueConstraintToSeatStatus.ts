import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToSeatStatus1734347925001 implements MigrationInterface {
    name = 'AddUniqueConstraintToSeatStatus1734347925001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, remove duplicate records keeping only the most recent one
        await queryRunner.query(`
            DELETE FROM seat_status
            WHERE id NOT IN (
                SELECT DISTINCT ON (trip_id, seat_id) id
                FROM seat_status
                ORDER BY trip_id, seat_id, id DESC
            )
        `);

        // Add unique constraint on (trip_id, seat_id)
        await queryRunner.query(`ALTER TABLE "seat_status" ADD CONSTRAINT "UQ_seat_status_trip_seat" UNIQUE ("trip_id", "seat_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seat_status" DROP CONSTRAINT "UQ_seat_status_trip_seat"`);
    }

}