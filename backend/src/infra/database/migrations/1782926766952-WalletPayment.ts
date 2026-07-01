import { MigrationInterface, QueryRunner } from "typeorm";

export class WalletPayment1782926766952 implements MigrationInterface {
    name = 'WalletPayment1782926766952'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`wallets\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`balance\` decimal(12,2) NOT NULL DEFAULT '0.00', \`pending_balance\` decimal(12,2) NOT NULL DEFAULT '0.00', \`currency\` char(3) NOT NULL DEFAULT 'BRL', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_92558c08091598f7a4439586cd\` (\`user_id\`), UNIQUE INDEX \`REL_92558c08091598f7a4439586cd\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`wallet_transactions\` (\`id\` varchar(36) NOT NULL, \`wallet_id\` varchar(36) NOT NULL, \`type\` enum ('credit', 'debit', 'hold', 'release') NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`balance_after\` decimal(12,2) NOT NULL, \`reference_type\` enum ('payment', 'withdrawal', 'refund', 'fee', 'adjustment') NULL, \`reference_id\` char(36) NULL, \`description\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_c57d19129968160f4db28fc8b2\` (\`wallet_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`payments\` (\`id\` varchar(36) NOT NULL, \`contract_id\` varchar(36) NOT NULL, \`payer_id\` varchar(36) NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`status\` enum ('pending', 'authorized', 'captured', 'failed', 'refunded') NOT NULL DEFAULT 'pending', \`method\` enum ('wallet', 'credit_card', 'pix', 'boleto') NOT NULL, \`external_reference\` varchar(255) NULL, \`paid_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_52fc2356fb8c211c93d4b1496f\` (\`contract_id\`), INDEX \`IDX_02f8e8d4094492641ad95010ca\` (\`payer_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`platform_fees\` (\`id\` varchar(36) NOT NULL, \`payment_id\` varchar(36) NOT NULL, \`percentage\` decimal(5,2) NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_c25b18ac5b0b987044b463035d\` (\`payment_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`refunds\` (\`id\` varchar(36) NOT NULL, \`payment_id\` varchar(36) NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`reason\` text NULL, \`status\` enum ('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending', \`processed_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_7f48aa5d56c42aeb495db01668\` (\`payment_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`withdrawals\` (\`id\` varchar(36) NOT NULL, \`wallet_id\` varchar(36) NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`payment_method\` enum ('pix', 'bank_transfer') NOT NULL, \`status\` enum ('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending', \`destination\` varchar(255) NOT NULL, \`processed_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_100cd2fde8ba74f923429eec37\` (\`wallet_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`wallets\` ADD CONSTRAINT \`FK_92558c08091598f7a4439586cda\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`wallet_transactions\` ADD CONSTRAINT \`FK_c57d19129968160f4db28fc8b28\` FOREIGN KEY (\`wallet_id\`) REFERENCES \`wallets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_52fc2356fb8c211c93d4b1496f3\` FOREIGN KEY (\`contract_id\`) REFERENCES \`contracts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`payments\` ADD CONSTRAINT \`FK_02f8e8d4094492641ad95010ca1\` FOREIGN KEY (\`payer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`platform_fees\` ADD CONSTRAINT \`FK_c25b18ac5b0b987044b463035d5\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`refunds\` ADD CONSTRAINT \`FK_7f48aa5d56c42aeb495db016683\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`withdrawals\` ADD CONSTRAINT \`FK_100cd2fde8ba74f923429eec374\` FOREIGN KEY (\`wallet_id\`) REFERENCES \`wallets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`withdrawals\` DROP FOREIGN KEY \`FK_100cd2fde8ba74f923429eec374\``);
        await queryRunner.query(`ALTER TABLE \`refunds\` DROP FOREIGN KEY \`FK_7f48aa5d56c42aeb495db016683\``);
        await queryRunner.query(`ALTER TABLE \`platform_fees\` DROP FOREIGN KEY \`FK_c25b18ac5b0b987044b463035d5\``);
        await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_02f8e8d4094492641ad95010ca1\``);
        await queryRunner.query(`ALTER TABLE \`payments\` DROP FOREIGN KEY \`FK_52fc2356fb8c211c93d4b1496f3\``);
        await queryRunner.query(`ALTER TABLE \`wallet_transactions\` DROP FOREIGN KEY \`FK_c57d19129968160f4db28fc8b28\``);
        await queryRunner.query(`ALTER TABLE \`wallets\` DROP FOREIGN KEY \`FK_92558c08091598f7a4439586cda\``);
        await queryRunner.query(`DROP INDEX \`IDX_100cd2fde8ba74f923429eec37\` ON \`withdrawals\``);
        await queryRunner.query(`DROP TABLE \`withdrawals\``);
        await queryRunner.query(`DROP INDEX \`IDX_7f48aa5d56c42aeb495db01668\` ON \`refunds\``);
        await queryRunner.query(`DROP TABLE \`refunds\``);
        await queryRunner.query(`DROP INDEX \`IDX_c25b18ac5b0b987044b463035d\` ON \`platform_fees\``);
        await queryRunner.query(`DROP TABLE \`platform_fees\``);
        await queryRunner.query(`DROP INDEX \`IDX_02f8e8d4094492641ad95010ca\` ON \`payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_52fc2356fb8c211c93d4b1496f\` ON \`payments\``);
        await queryRunner.query(`DROP TABLE \`payments\``);
        await queryRunner.query(`DROP INDEX \`IDX_c57d19129968160f4db28fc8b2\` ON \`wallet_transactions\``);
        await queryRunner.query(`DROP TABLE \`wallet_transactions\``);
        await queryRunner.query(`DROP INDEX \`REL_92558c08091598f7a4439586cd\` ON \`wallets\``);
        await queryRunner.query(`DROP INDEX \`IDX_92558c08091598f7a4439586cd\` ON \`wallets\``);
        await queryRunner.query(`DROP TABLE \`wallets\``);
    }

}
