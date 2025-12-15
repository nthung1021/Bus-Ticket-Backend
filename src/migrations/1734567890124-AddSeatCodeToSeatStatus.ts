import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSeatCodeToSeatStatus1734567890124 implements MigrationInterface {
  name = 'AddSeatCodeToSeatStatus1734567890124';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add seat_code column to seat_status table
    await queryRunner.addColumn(
      'seat_status',
      new TableColumn({
        name: 'seat_code',
        type: 'varchar',
        isNullable: false,
        default: "''", // Temporary default for existing records
      })
    );

    // Update existing records with seat_code from seats table
    await queryRunner.query(`
      UPDATE seat_status 
      SET seat_code = seats.seat_code 
      FROM seats 
      WHERE seat_status.seat_id = seats.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seat_code column from seat_status table
    await queryRunner.dropColumn('seat_status', 'seat_code');
  }
}