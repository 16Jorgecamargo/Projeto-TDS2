import { MigrationInterface, QueryRunner } from "typeorm";

export class AuthAccount1782924908822 implements MigrationInterface {
    name = 'AuthAccount1782924908822'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` varchar(36) NOT NULL, \`email\` varchar(255) NOT NULL, \`phone\` varchar(20) NULL, \`password_hash\` varchar(255) NOT NULL, \`role\` enum ('client', 'professional', 'admin') NOT NULL, \`full_name\` varchar(255) NOT NULL, \`cpf\` varchar(14) NULL, \`avatar_url\` varchar(255) NULL, \`status\` enum ('active', 'suspended', 'deleted') NOT NULL DEFAULT 'active', \`email_verified_at\` datetime NULL, \`phone_verified_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), UNIQUE INDEX \`IDX_a000cca60bcf04454e72769949\` (\`phone\`), UNIQUE INDEX \`IDX_230b925048540454c8b4c481e1\` (\`cpf\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_preferences\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`language\` varchar(10) NOT NULL DEFAULT 'pt-BR', \`timezone\` varchar(64) NOT NULL DEFAULT 'America/Sao_Paulo', \`email_notifications\` tinyint NOT NULL DEFAULT 1, \`push_notifications\` tinyint NOT NULL DEFAULT 1, \`sms_notifications\` tinyint NOT NULL DEFAULT 0, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_458057fa75b66e68a275647da2\` (\`user_id\`), UNIQUE INDEX \`REL_458057fa75b66e68a275647da2\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_oauth_accounts\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`provider\` enum ('google', 'facebook', 'apple') NOT NULL, \`provider_account_id\` varchar(255) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_a093a39110ecd3602d87f0e814\` (\`user_id\`), UNIQUE INDEX \`IDX_ad572f641bc3e9d46211788bac\` (\`provider\`, \`provider_account_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_consents\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`consent_type\` enum ('terms', 'privacy', 'marketing', 'data_processing') NOT NULL, \`granted\` tinyint NOT NULL, \`version\` varchar(32) NOT NULL, \`granted_at\` datetime NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_6283f1222bdc2390cf16836ce7\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`refresh_tokens\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`token_hash\` varchar(255) NOT NULL, \`expires_at\` datetime NOT NULL, \`revoked_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_3ddc983c5f7bcf132fd8732c3f\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`push_device_tokens\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`token\` varchar(512) NOT NULL, \`platform\` enum ('ios', 'android', 'web') NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_6e59be68a9d84d799895fb0158\` (\`user_id\`), UNIQUE INDEX \`IDX_c7672e8384b0d7728c52e69cbe\` (\`user_id\`, \`token\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`phone_verification_tokens\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`code\` varchar(10) NOT NULL, \`expires_at\` datetime NOT NULL, \`used_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_f1aec82d533ad43fb02dc69b51\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`password_reset_tokens\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`token_hash\` varchar(255) NOT NULL, \`expires_at\` datetime NOT NULL, \`used_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_52ac39dd8a28730c63aeb428c9\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`email_verification_tokens\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`token_hash\` varchar(255) NOT NULL, \`expires_at\` datetime NOT NULL, \`used_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_fdcb77f72f529bf65c95d72a14\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`account_deletion_requests\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`reason\` text NULL, \`requested_at\` datetime NOT NULL, \`scheduled_purge_at\` datetime NOT NULL, \`status\` enum ('pending', 'cancelled', 'completed') NOT NULL DEFAULT 'pending', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_741b76f2bbc0cc65281abb0828\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_preferences\` ADD CONSTRAINT \`FK_458057fa75b66e68a275647da2e\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_oauth_accounts\` ADD CONSTRAINT \`FK_a093a39110ecd3602d87f0e814b\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_consents\` ADD CONSTRAINT \`FK_6283f1222bdc2390cf16836ce7d\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_3ddc983c5f7bcf132fd8732c3f4\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`push_device_tokens\` ADD CONSTRAINT \`FK_6e59be68a9d84d799895fb01588\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`phone_verification_tokens\` ADD CONSTRAINT \`FK_f1aec82d533ad43fb02dc69b51e\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`password_reset_tokens\` ADD CONSTRAINT \`FK_52ac39dd8a28730c63aeb428c9c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`email_verification_tokens\` ADD CONSTRAINT \`FK_fdcb77f72f529bf65c95d72a147\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`account_deletion_requests\` ADD CONSTRAINT \`FK_741b76f2bbc0cc65281abb08287\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`account_deletion_requests\` DROP FOREIGN KEY \`FK_741b76f2bbc0cc65281abb08287\``);
        await queryRunner.query(`ALTER TABLE \`email_verification_tokens\` DROP FOREIGN KEY \`FK_fdcb77f72f529bf65c95d72a147\``);
        await queryRunner.query(`ALTER TABLE \`password_reset_tokens\` DROP FOREIGN KEY \`FK_52ac39dd8a28730c63aeb428c9c\``);
        await queryRunner.query(`ALTER TABLE \`phone_verification_tokens\` DROP FOREIGN KEY \`FK_f1aec82d533ad43fb02dc69b51e\``);
        await queryRunner.query(`ALTER TABLE \`push_device_tokens\` DROP FOREIGN KEY \`FK_6e59be68a9d84d799895fb01588\``);
        await queryRunner.query(`ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_3ddc983c5f7bcf132fd8732c3f4\``);
        await queryRunner.query(`ALTER TABLE \`user_consents\` DROP FOREIGN KEY \`FK_6283f1222bdc2390cf16836ce7d\``);
        await queryRunner.query(`ALTER TABLE \`user_oauth_accounts\` DROP FOREIGN KEY \`FK_a093a39110ecd3602d87f0e814b\``);
        await queryRunner.query(`ALTER TABLE \`user_preferences\` DROP FOREIGN KEY \`FK_458057fa75b66e68a275647da2e\``);
        await queryRunner.query(`DROP INDEX \`IDX_741b76f2bbc0cc65281abb0828\` ON \`account_deletion_requests\``);
        await queryRunner.query(`DROP TABLE \`account_deletion_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_fdcb77f72f529bf65c95d72a14\` ON \`email_verification_tokens\``);
        await queryRunner.query(`DROP TABLE \`email_verification_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_52ac39dd8a28730c63aeb428c9\` ON \`password_reset_tokens\``);
        await queryRunner.query(`DROP TABLE \`password_reset_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_f1aec82d533ad43fb02dc69b51\` ON \`phone_verification_tokens\``);
        await queryRunner.query(`DROP TABLE \`phone_verification_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_c7672e8384b0d7728c52e69cbe\` ON \`push_device_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_6e59be68a9d84d799895fb0158\` ON \`push_device_tokens\``);
        await queryRunner.query(`DROP TABLE \`push_device_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_3ddc983c5f7bcf132fd8732c3f\` ON \`refresh_tokens\``);
        await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_6283f1222bdc2390cf16836ce7\` ON \`user_consents\``);
        await queryRunner.query(`DROP TABLE \`user_consents\``);
        await queryRunner.query(`DROP INDEX \`IDX_ad572f641bc3e9d46211788bac\` ON \`user_oauth_accounts\``);
        await queryRunner.query(`DROP INDEX \`IDX_a093a39110ecd3602d87f0e814\` ON \`user_oauth_accounts\``);
        await queryRunner.query(`DROP TABLE \`user_oauth_accounts\``);
        await queryRunner.query(`DROP INDEX \`REL_458057fa75b66e68a275647da2\` ON \`user_preferences\``);
        await queryRunner.query(`DROP INDEX \`IDX_458057fa75b66e68a275647da2\` ON \`user_preferences\``);
        await queryRunner.query(`DROP TABLE \`user_preferences\``);
        await queryRunner.query(`DROP INDEX \`IDX_230b925048540454c8b4c481e1\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_a000cca60bcf04454e72769949\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
