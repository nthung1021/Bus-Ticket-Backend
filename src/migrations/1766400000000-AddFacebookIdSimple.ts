import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFacebookIdSimple1766400000000 implements MigrationInterface {
    name = 'AddFacebookIdSimple1766400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column already exists
        const columnExists = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'facebookId'
        `);
        
        if (columnExists.length === 0) {
            // Add facebookId column to users table
            await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "facebookId" character varying`);
            
            // Add unique constraint
            await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_users_facebook_id" UNIQUE ("facebookId")`);
            
            // Add index for performance
            await queryRunner.query(`CREATE INDEX "idx_users_facebook_id" ON "users" ("facebookId")`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove Facebook ID related objects
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_facebook_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_facebook_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "facebookId"`);
    }
}