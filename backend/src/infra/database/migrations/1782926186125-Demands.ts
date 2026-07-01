import { MigrationInterface, QueryRunner } from "typeorm";

export class Demands1782926186125 implements MigrationInterface {
    name = 'Demands1782926186125'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`service_demands\` (\`id\` varchar(36) NOT NULL, \`client_id\` varchar(36) NOT NULL, \`category_id\` varchar(36) NOT NULL, \`address_id\` varchar(36) NULL, \`title\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`budget_min\` decimal(10,2) NULL, \`budget_max\` decimal(10,2) NULL, \`status\` enum ('open', 'in_progress', 'closed', 'cancelled') NOT NULL DEFAULT 'open', \`preferred_date\` date NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_cdc9d14424320a702ff63cd224\` (\`client_id\`), INDEX \`IDX_f76514c8dce4d1abd70a75b74e\` (\`category_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`demand_images\` (\`id\` varchar(36) NOT NULL, \`demand_id\` varchar(36) NOT NULL, \`image_url\` varchar(512) NOT NULL, \`position\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_a824055d875ea466a6dff3ac63\` (\`demand_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`demand_tags\` (\`id\` varchar(36) NOT NULL, \`demand_id\` varchar(36) NOT NULL, \`tag_id\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_089c656bacc8ae7c6751d256ba\` (\`demand_id\`), INDEX \`IDX_e78322daa887b93614e55c9d31\` (\`tag_id\`), UNIQUE INDEX \`IDX_65a5886a17f4d6ff92250d458a\` (\`demand_id\`, \`tag_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`demand_invitations\` (\`id\` varchar(36) NOT NULL, \`demand_id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`status\` enum ('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending', \`invited_at\` datetime NOT NULL, \`responded_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_7112da2359a53c34742921e24b\` (\`demand_id\`), INDEX \`IDX_73d30ab1d7492f7321ffe59dc6\` (\`professional_id\`), UNIQUE INDEX \`IDX_954af5860d5bf1d3019da33fc1\` (\`demand_id\`, \`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD CONSTRAINT \`FK_cdc9d14424320a702ff63cd2248\` FOREIGN KEY (\`client_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD CONSTRAINT \`FK_f76514c8dce4d1abd70a75b74e6\` FOREIGN KEY (\`category_id\`) REFERENCES \`service_categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`service_demands\` ADD CONSTRAINT \`FK_a6299af0f0b71046f7492e61599\` FOREIGN KEY (\`address_id\`) REFERENCES \`addresses\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`demand_images\` ADD CONSTRAINT \`FK_a824055d875ea466a6dff3ac635\` FOREIGN KEY (\`demand_id\`) REFERENCES \`service_demands\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`demand_tags\` ADD CONSTRAINT \`FK_089c656bacc8ae7c6751d256ba1\` FOREIGN KEY (\`demand_id\`) REFERENCES \`service_demands\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`demand_tags\` ADD CONSTRAINT \`FK_e78322daa887b93614e55c9d31e\` FOREIGN KEY (\`tag_id\`) REFERENCES \`service_tags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`demand_invitations\` ADD CONSTRAINT \`FK_7112da2359a53c34742921e24b6\` FOREIGN KEY (\`demand_id\`) REFERENCES \`service_demands\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`demand_invitations\` ADD CONSTRAINT \`FK_73d30ab1d7492f7321ffe59dc62\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`demand_invitations\` DROP FOREIGN KEY \`FK_73d30ab1d7492f7321ffe59dc62\``);
        await queryRunner.query(`ALTER TABLE \`demand_invitations\` DROP FOREIGN KEY \`FK_7112da2359a53c34742921e24b6\``);
        await queryRunner.query(`ALTER TABLE \`demand_tags\` DROP FOREIGN KEY \`FK_e78322daa887b93614e55c9d31e\``);
        await queryRunner.query(`ALTER TABLE \`demand_tags\` DROP FOREIGN KEY \`FK_089c656bacc8ae7c6751d256ba1\``);
        await queryRunner.query(`ALTER TABLE \`demand_images\` DROP FOREIGN KEY \`FK_a824055d875ea466a6dff3ac635\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP FOREIGN KEY \`FK_a6299af0f0b71046f7492e61599\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP FOREIGN KEY \`FK_f76514c8dce4d1abd70a75b74e6\``);
        await queryRunner.query(`ALTER TABLE \`service_demands\` DROP FOREIGN KEY \`FK_cdc9d14424320a702ff63cd2248\``);
        await queryRunner.query(`DROP INDEX \`IDX_954af5860d5bf1d3019da33fc1\` ON \`demand_invitations\``);
        await queryRunner.query(`DROP INDEX \`IDX_73d30ab1d7492f7321ffe59dc6\` ON \`demand_invitations\``);
        await queryRunner.query(`DROP INDEX \`IDX_7112da2359a53c34742921e24b\` ON \`demand_invitations\``);
        await queryRunner.query(`DROP TABLE \`demand_invitations\``);
        await queryRunner.query(`DROP INDEX \`IDX_65a5886a17f4d6ff92250d458a\` ON \`demand_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_e78322daa887b93614e55c9d31\` ON \`demand_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_089c656bacc8ae7c6751d256ba\` ON \`demand_tags\``);
        await queryRunner.query(`DROP TABLE \`demand_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_a824055d875ea466a6dff3ac63\` ON \`demand_images\``);
        await queryRunner.query(`DROP TABLE \`demand_images\``);
        await queryRunner.query(`DROP INDEX \`IDX_f76514c8dce4d1abd70a75b74e\` ON \`service_demands\``);
        await queryRunner.query(`DROP INDEX \`IDX_cdc9d14424320a702ff63cd224\` ON \`service_demands\``);
        await queryRunner.query(`DROP TABLE \`service_demands\``);
    }

}
