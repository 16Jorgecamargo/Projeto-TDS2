import { MigrationInterface, QueryRunner } from "typeorm";

export class Addresses1782925472617 implements MigrationInterface {
    name = 'Addresses1782925472617'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`addresses\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`label\` varchar(64) NULL, \`street\` varchar(255) NOT NULL, \`number\` varchar(20) NOT NULL, \`complement\` varchar(255) NULL, \`district\` varchar(128) NOT NULL, \`city\` varchar(128) NOT NULL, \`state\` char(2) NOT NULL, \`zip_code\` varchar(9) NOT NULL, \`country\` char(2) NOT NULL DEFAULT 'BR', \`latitude\` decimal(10,8) NULL, \`longitude\` decimal(11,8) NULL, \`is_primary\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_16aac8a9f6f9c1dd6bcb75ec02\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD CONSTRAINT \`FK_16aac8a9f6f9c1dd6bcb75ec023\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP FOREIGN KEY \`FK_16aac8a9f6f9c1dd6bcb75ec023\``);
        await queryRunner.query(`DROP INDEX \`IDX_16aac8a9f6f9c1dd6bcb75ec02\` ON \`addresses\``);
        await queryRunner.query(`DROP TABLE \`addresses\``);
    }

}
