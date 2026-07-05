import { MigrationInterface, QueryRunner } from "typeorm";

export class UserPreferenceLocation1782927300000 implements MigrationInterface {
    name = 'UserPreferenceLocation1782927300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_preferences\` ADD \`city\` varchar(120) NULL`);
        await queryRunner.query(`ALTER TABLE \`user_preferences\` ADD \`state\` varchar(2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_preferences\` DROP COLUMN \`state\``);
        await queryRunner.query(`ALTER TABLE \`user_preferences\` DROP COLUMN \`city\``);
    }

}
