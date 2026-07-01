import { MigrationInterface, QueryRunner } from "typeorm";

export class ProfessionalProfile1782925602537 implements MigrationInterface {
    name = 'ProfessionalProfile1782925602537'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`professional_profiles\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`headline\` varchar(255) NOT NULL, \`bio\` text NULL, \`years_experience\` int NULL, \`hourly_rate\` decimal(10,2) NULL, \`service_radius_km\` int NULL, \`rating_average\` decimal(3,2) NOT NULL DEFAULT '0.00', \`rating_count\` int NOT NULL DEFAULT '0', \`is_available\` tinyint NOT NULL DEFAULT 1, \`verified_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_ed5f5b62a353f11b36ceb7e2e8\` (\`user_id\`), UNIQUE INDEX \`REL_ed5f5b62a353f11b36ceb7e2e8\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`professional_documents\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`type\` enum ('rg', 'cpf', 'cnpj', 'proof_of_address', 'certificate') NOT NULL, \`file_url\` varchar(512) NOT NULL, \`status\` enum ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending', \`reviewed_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_12c29437694f80e56ca489853b\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`professional_experiences\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`title\` varchar(255) NOT NULL, \`company\` varchar(255) NULL, \`description\` text NULL, \`start_date\` date NOT NULL, \`end_date\` date NULL, \`is_current\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_7241ee01222fe53d52a8d389ed\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`professional_education\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`institution\` varchar(255) NOT NULL, \`degree\` varchar(255) NOT NULL, \`field_of_study\` varchar(255) NULL, \`start_date\` date NULL, \`end_date\` date NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_5ca7236d85cab8ee578ceac9b2\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`professional_certifications\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`name\` varchar(255) NOT NULL, \`issuer\` varchar(255) NOT NULL, \`issued_at\` date NULL, \`expires_at\` date NULL, \`credential_url\` varchar(512) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_6c4c9684fbcc2f3454747b3f47\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`professional_service_areas\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`city\` varchar(128) NOT NULL, \`state\` char(2) NOT NULL, \`radius_km\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_b61a2f497de0d945ae9c4375c5\` (\`professional_id\`), UNIQUE INDEX \`IDX_6686e5839d448ca3e6910674a2\` (\`professional_id\`, \`city\`, \`state\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`availability_slots\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`weekday\` tinyint NOT NULL, \`start_time\` time NOT NULL, \`end_time\` time NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_58d0e584be60568d93b935dc64\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`availability_exceptions\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`date\` date NOT NULL, \`is_available\` tinyint NOT NULL, \`start_time\` time NULL, \`end_time\` time NULL, \`reason\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_c7fb7bc26327ebef89927070ff\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`portfolio_items\` (\`id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`category_id\` char(36) NULL, \`title\` varchar(255) NOT NULL, \`description\` text NULL, \`completed_at\` date NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_a5b919269cbc4b54747420011e\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`portfolio_images\` (\`id\` varchar(36) NOT NULL, \`portfolio_item_id\` varchar(36) NOT NULL, \`image_url\` varchar(512) NOT NULL, \`position\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_def2ebe696a0d3a03a4edd9410\` (\`portfolio_item_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`professional_profiles\` ADD CONSTRAINT \`FK_ed5f5b62a353f11b36ceb7e2e8e\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_documents\` ADD CONSTRAINT \`FK_12c29437694f80e56ca489853bc\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_experiences\` ADD CONSTRAINT \`FK_7241ee01222fe53d52a8d389ed0\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_education\` ADD CONSTRAINT \`FK_5ca7236d85cab8ee578ceac9b2d\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_certifications\` ADD CONSTRAINT \`FK_6c4c9684fbcc2f3454747b3f475\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`professional_service_areas\` ADD CONSTRAINT \`FK_b61a2f497de0d945ae9c4375c52\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`availability_slots\` ADD CONSTRAINT \`FK_58d0e584be60568d93b935dc643\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`availability_exceptions\` ADD CONSTRAINT \`FK_c7fb7bc26327ebef89927070ffc\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` ADD CONSTRAINT \`FK_a5b919269cbc4b54747420011e1\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`portfolio_images\` ADD CONSTRAINT \`FK_def2ebe696a0d3a03a4edd9410e\` FOREIGN KEY (\`portfolio_item_id\`) REFERENCES \`portfolio_items\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`portfolio_images\` DROP FOREIGN KEY \`FK_def2ebe696a0d3a03a4edd9410e\``);
        await queryRunner.query(`ALTER TABLE \`portfolio_items\` DROP FOREIGN KEY \`FK_a5b919269cbc4b54747420011e1\``);
        await queryRunner.query(`ALTER TABLE \`availability_exceptions\` DROP FOREIGN KEY \`FK_c7fb7bc26327ebef89927070ffc\``);
        await queryRunner.query(`ALTER TABLE \`availability_slots\` DROP FOREIGN KEY \`FK_58d0e584be60568d93b935dc643\``);
        await queryRunner.query(`ALTER TABLE \`professional_service_areas\` DROP FOREIGN KEY \`FK_b61a2f497de0d945ae9c4375c52\``);
        await queryRunner.query(`ALTER TABLE \`professional_certifications\` DROP FOREIGN KEY \`FK_6c4c9684fbcc2f3454747b3f475\``);
        await queryRunner.query(`ALTER TABLE \`professional_education\` DROP FOREIGN KEY \`FK_5ca7236d85cab8ee578ceac9b2d\``);
        await queryRunner.query(`ALTER TABLE \`professional_experiences\` DROP FOREIGN KEY \`FK_7241ee01222fe53d52a8d389ed0\``);
        await queryRunner.query(`ALTER TABLE \`professional_documents\` DROP FOREIGN KEY \`FK_12c29437694f80e56ca489853bc\``);
        await queryRunner.query(`ALTER TABLE \`professional_profiles\` DROP FOREIGN KEY \`FK_ed5f5b62a353f11b36ceb7e2e8e\``);
        await queryRunner.query(`DROP INDEX \`IDX_def2ebe696a0d3a03a4edd9410\` ON \`portfolio_images\``);
        await queryRunner.query(`DROP TABLE \`portfolio_images\``);
        await queryRunner.query(`DROP INDEX \`IDX_a5b919269cbc4b54747420011e\` ON \`portfolio_items\``);
        await queryRunner.query(`DROP TABLE \`portfolio_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_c7fb7bc26327ebef89927070ff\` ON \`availability_exceptions\``);
        await queryRunner.query(`DROP TABLE \`availability_exceptions\``);
        await queryRunner.query(`DROP INDEX \`IDX_58d0e584be60568d93b935dc64\` ON \`availability_slots\``);
        await queryRunner.query(`DROP TABLE \`availability_slots\``);
        await queryRunner.query(`DROP INDEX \`IDX_6686e5839d448ca3e6910674a2\` ON \`professional_service_areas\``);
        await queryRunner.query(`DROP INDEX \`IDX_b61a2f497de0d945ae9c4375c5\` ON \`professional_service_areas\``);
        await queryRunner.query(`DROP TABLE \`professional_service_areas\``);
        await queryRunner.query(`DROP INDEX \`IDX_6c4c9684fbcc2f3454747b3f47\` ON \`professional_certifications\``);
        await queryRunner.query(`DROP TABLE \`professional_certifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_5ca7236d85cab8ee578ceac9b2\` ON \`professional_education\``);
        await queryRunner.query(`DROP TABLE \`professional_education\``);
        await queryRunner.query(`DROP INDEX \`IDX_7241ee01222fe53d52a8d389ed\` ON \`professional_experiences\``);
        await queryRunner.query(`DROP TABLE \`professional_experiences\``);
        await queryRunner.query(`DROP INDEX \`IDX_12c29437694f80e56ca489853b\` ON \`professional_documents\``);
        await queryRunner.query(`DROP TABLE \`professional_documents\``);
        await queryRunner.query(`DROP INDEX \`REL_ed5f5b62a353f11b36ceb7e2e8\` ON \`professional_profiles\``);
        await queryRunner.query(`DROP INDEX \`IDX_ed5f5b62a353f11b36ceb7e2e8\` ON \`professional_profiles\``);
        await queryRunner.query(`DROP TABLE \`professional_profiles\``);
    }

}
