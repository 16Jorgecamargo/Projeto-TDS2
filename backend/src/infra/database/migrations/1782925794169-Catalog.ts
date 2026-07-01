import { MigrationInterface, QueryRunner } from "typeorm";

export class Catalog1782925794169 implements MigrationInterface {
    name = 'Catalog1782925794169'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`service_categories\` (\`id\` varchar(36) NOT NULL, \`parent_id\` varchar(36) NULL, \`name\` varchar(128) NOT NULL, \`slug\` varchar(160) NOT NULL, \`icon\` varchar(128) NULL, \`description\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_88a33271b3d94a0c4bc14db3b7\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`service_tags\` (\`id\` varchar(36) NOT NULL, \`name\` varchar(128) NOT NULL, \`slug\` varchar(160) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_d10dc2aaa6add51463b7283250\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`professional_categories\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`category_id\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_895b29202c6d6dad57191389b9\` (\`professional_id\`), INDEX \`IDX_4e5a9c4243c20b7d25b88d39e7\` (\`category_id\`), UNIQUE INDEX \`IDX_57fba0a4a61e5ba020a6988187\` (\`professional_id\`, \`category_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`professional_tags\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`tag_id\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_42264bf9f828a6f26c8b07e1cb\` (\`professional_id\`), INDEX \`IDX_8c752343954201e77b078caa09\` (\`tag_id\`), UNIQUE INDEX \`IDX_b0493e0cd449ad0fdd062c2c0f\` (\`professional_id\`, \`tag_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` DROP COLUMN \`category_id\``);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` ADD \`category_id\` varchar(36) NULL`);
        await queryRunner.query(`ALTER TABLE \`service_categories\` ADD CONSTRAINT \`FK_b7de58e20d83c95c929ccba97ce\` FOREIGN KEY (\`parent_id\`) REFERENCES \`service_categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` ADD CONSTRAINT \`FK_510f115eb11a933711a49043d73\` FOREIGN KEY (\`category_id\`) REFERENCES \`service_categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_categories\` ADD CONSTRAINT \`FK_895b29202c6d6dad57191389b99\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_categories\` ADD CONSTRAINT \`FK_4e5a9c4243c20b7d25b88d39e72\` FOREIGN KEY (\`category_id\`) REFERENCES \`service_categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_tags\` ADD CONSTRAINT \`FK_42264bf9f828a6f26c8b07e1cba\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_tags\` ADD CONSTRAINT \`FK_8c752343954201e77b078caa097\` FOREIGN KEY (\`tag_id\`) REFERENCES \`service_tags\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`professional_tags\` DROP FOREIGN KEY \`FK_8c752343954201e77b078caa097\``);
        await queryRunner.query(`ALTER TABLE \`professional_tags\` DROP FOREIGN KEY \`FK_42264bf9f828a6f26c8b07e1cba\``);
        await queryRunner.query(`ALTER TABLE \`professional_categories\` DROP FOREIGN KEY \`FK_4e5a9c4243c20b7d25b88d39e72\``);
        await queryRunner.query(`ALTER TABLE \`professional_categories\` DROP FOREIGN KEY \`FK_895b29202c6d6dad57191389b99\``);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` DROP FOREIGN KEY \`FK_510f115eb11a933711a49043d73\``);
        await queryRunner.query(`ALTER TABLE \`service_categories\` DROP FOREIGN KEY \`FK_b7de58e20d83c95c929ccba97ce\``);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` DROP COLUMN \`category_id\``);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` ADD \`category_id\` char(36) NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_b0493e0cd449ad0fdd062c2c0f\` ON \`professional_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_8c752343954201e77b078caa09\` ON \`professional_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_42264bf9f828a6f26c8b07e1cb\` ON \`professional_tags\``);
        await queryRunner.query(`DROP TABLE \`professional_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_57fba0a4a61e5ba020a6988187\` ON \`professional_categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_4e5a9c4243c20b7d25b88d39e7\` ON \`professional_categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_895b29202c6d6dad57191389b9\` ON \`professional_categories\``);
        await queryRunner.query(`DROP TABLE \`professional_categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_d10dc2aaa6add51463b7283250\` ON \`service_tags\``);
        await queryRunner.query(`DROP TABLE \`service_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_88a33271b3d94a0c4bc14db3b7\` ON \`service_categories\``);
        await queryRunner.query(`DROP TABLE \`service_categories\``);
    }

}
