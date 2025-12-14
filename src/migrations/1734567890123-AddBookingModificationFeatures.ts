import { MigrationInterface, QueryRunner, TableColumn, Table } from 'typeorm';

export class AddBookingModificationFeatures1734567890123 implements MigrationInterface {
  name = 'AddBookingModificationFeatures1734567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add last_modified_at column to bookings table
    await queryRunner.addColumn(
      'bookings',
      new TableColumn({
        name: 'last_modified_at',
        type: 'timestamp with time zone',
        isNullable: true,
      })
    );

    // Create booking_modification_history table
    await queryRunner.createTable(
      new Table({
        name: 'booking_modification_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'booking_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'modification_type',
            type: 'enum',
            enum: ['passenger_info', 'seat_change', 'contact_info'],
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'changes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'previous_values',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'modified_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_booking_modification_history_booking',
            columnNames: ['booking_id'],
            referencedTableName: 'bookings',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_booking_modification_history_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          {
            name: 'idx_modification_history_booking_id',
            columnNames: ['booking_id'],
          },
          {
            name: 'idx_modification_history_user_id',
            columnNames: ['user_id'],
          },
          {
            name: 'idx_modification_history_booking',
            columnNames: ['booking_id'],
          },
          {
            name: 'idx_modification_history_user',
            columnNames: ['user_id'],
          },
          {
            name: 'idx_modification_history_type',
            columnNames: ['modification_type'],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop booking_modification_history table
    await queryRunner.dropTable('booking_modification_history');

    // Remove last_modified_at column from bookings table
    await queryRunner.dropColumn('bookings', 'last_modified_at');
  }
}