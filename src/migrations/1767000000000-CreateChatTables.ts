import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatTables1767000000000 implements MigrationInterface {
    name = 'CreateChatTables1767000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "conversation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying, CONSTRAINT "PK_conversation_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid, "role" character varying, "content" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_message_id" PRIMARY KEY ("id"))`);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_message_conversation') THEN
                    ALTER TABLE "message" ADD CONSTRAINT "FK_message_conversation" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END;
            $$;
        `);

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_message_conversation" ON "message" ("conversationId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_message_createdAt" ON "message" ("createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT IF EXISTS "FK_message_conversation"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_message_createdAt"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_message_conversation"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "message"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "conversation"`);
    }

}
