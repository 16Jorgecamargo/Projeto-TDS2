import { MigrationInterface, QueryRunner } from "typeorm";

export class Quotes1782926462764 implements MigrationInterface {
    name = 'Quotes1782926462764'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`quotes\` (\`id\` varchar(36) NOT NULL, \`demand_id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`message\` text NULL, \`total_amount\` decimal(10,2) NOT NULL, \`estimated_days\` int NULL, \`status\` enum ('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending', \`valid_until\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_6dfda880ab559f59f6d62382be\` (\`demand_id\`), INDEX \`IDX_0598ad9cb27b9aa8f92caf5901\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`quote_items\` (\`id\` varchar(36) NOT NULL, \`quote_id\` varchar(36) NOT NULL, \`description\` varchar(255) NOT NULL, \`quantity\` int NOT NULL DEFAULT '1', \`unit_price\` decimal(10,2) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_c11d594b8cf436caaee20122fd\` (\`quote_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`quotes\` ADD CONSTRAINT \`FK_6dfda880ab559f59f6d62382be2\` FOREIGN KEY (\`demand_id\`) REFERENCES \`service_demands\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quotes\` ADD CONSTRAINT \`FK_0598ad9cb27b9aa8f92caf59013\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`quote_items\` ADD CONSTRAINT \`FK_c11d594b8cf436caaee20122fd8\` FOREIGN KEY (\`quote_id\`) REFERENCES \`quotes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`quote_items\` DROP FOREIGN KEY \`FK_c11d594b8cf436caaee20122fd8\``);
        await queryRunner.query(`ALTER TABLE \`quotes\` DROP FOREIGN KEY \`FK_0598ad9cb27b9aa8f92caf59013\``);
        await queryRunner.query(`ALTER TABLE \`quotes\` DROP FOREIGN KEY \`FK_6dfda880ab559f59f6d62382be2\``);
        await queryRunner.query(`DROP INDEX \`IDX_c11d594b8cf436caaee20122fd\` ON \`quote_items\``);
        await queryRunner.query(`DROP TABLE \`quote_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_0598ad9cb27b9aa8f92caf5901\` ON \`quotes\``);
        await queryRunner.query(`DROP INDEX \`IDX_6dfda880ab559f59f6d62382be\` ON \`quotes\``);
        await queryRunner.query(`DROP TABLE \`quotes\``);
    }

}
