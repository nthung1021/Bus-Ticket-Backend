import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBusTypeColumn1704067200000 implements MigrationInterface {
    name = 'AddBusTypeColumn1704067200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type
        await queryRunner.query(`CREATE TYPE "public"."buses_bus_type_enum" AS ENUM('standard', 'limousine', 'sleeper', 'seater', 'vip', 'business')`);
        
        // Add the busType column with default value
        await queryRunner.query(`ALTER TABLE "buses" ADD COLUMN "bus_type" "public"."buses_bus_type_enum" NOT NULL DEFAULT 'standard'`);
        
        // Create index for better performance
        await queryRunner.query(`CREATE INDEX "idx_buses_bus_type" ON "buses" ("bus_type")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the index
        await queryRunner.query(`DROP INDEX "idx_buses_bus_type"`);
        
        // Drop the column
        await queryRunner.query(`ALTER TABLE "buses" DROP COLUMN "bus_type"`);
        
        // Drop the enum type
        await queryRunner.query(`DROP TYPE "public"."buses_bus_type_enum"`);
    }
}