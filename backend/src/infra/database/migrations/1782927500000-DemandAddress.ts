import { MigrationInterface, QueryRunner } from "typeorm";

export class DemandAddress1782927500000 implements MigrationInterface {
    name = 'DemandAddress1782927500000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP FOREIGN KEY \`FK_a6299af0f0b71046f7492e61599\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`address_id\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`street\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`number\` varchar(20) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`complement\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`district\` varchar(128) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`city\` varchar(128) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`state\` char(2) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`zip_code\` varchar(9) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`zip_code\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`state\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`city\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`district\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`complement\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP COLUMN \`number\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD \`address_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD CONSTRAINT \`FK_a6299af0f0b71046f7492e61599\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
