import { MigrationInterface, QueryRunner } from "typeorm";

export class Social1782926888239 implements MigrationInterface {
    name = 'Social1782926888239'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`reviews\` (\`id\` varchar(36) NOT NULL, \`contract_id\` varchar(36) NOT NULL, \`reviewer_id\` varchar(36) NOT NULL, \`reviewee_id\` varchar(36) NOT NULL, \`rating\` int NOT NULL, \`comment\` text NULL, \`response\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_d524fbe85d4619f66b10a66448\` (\`contract_id\`), INDEX \`IDX_a7b3e1afadd6b52f3b6864745e\` (\`reviewee_id\`), UNIQUE INDEX \`IDX_bab8557ca282771fbb87c65068\` (\`contract_id\`, \`reviewer_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`favorites\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_35a6b05ee3b624d0de01ee5059\` (\`user_id\`), INDEX \`IDX_e6d445d58084164345ba85d7ab\` (\`professional_id\`), UNIQUE INDEX \`IDX_161547c8f2db6bb2fc81de68e9\` (\`user_id\`, \`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`reports\` (\`id\` varchar(36) NOT NULL, \`reporter_id\` varchar(36) NOT NULL, \`target_type\` enum ('user', 'demand', 'review', 'message') NOT NULL, \`target_id\` char(36) NOT NULL, \`reason\` enum ('spam', 'abuse', 'fraud', 'inappropriate', 'other') NOT NULL, \`description\` text NULL, \`status\` enum ('pending', 'reviewed', 'dismissed', 'actioned') NOT NULL DEFAULT 'pending', \`reviewed_by\` varchar(36) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_9459b9bf907a3807ef7143d2ea\` (\`reporter_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_blocks\` (\`id\` varchar(36) NOT NULL, \`blocker_id\` varchar(36) NOT NULL, \`blocked_id\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_dfcd8a81016d1de587fbd2d70b\` (\`blocker_id\`), INDEX \`IDX_7a0806a54f0ad9ced3e247cacd\` (\`blocked_id\`), UNIQUE INDEX \`IDX_48667515438e7d0f0fed998b19\` (\`blocker_id\`, \`blocked_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_d524fbe85d4619f66b10a664487\` FOREIGN KEY (\`contract_id\`) REFERENCES \`contracts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_92e950a2513a79bb3fab273c92e\` FOREIGN KEY (\`reviewer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reviews\` ADD CONSTRAINT \`FK_a7b3e1afadd6b52f3b6864745e3\` FOREIGN KEY (\`reviewee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`favorites\` ADD CONSTRAINT \`FK_35a6b05ee3b624d0de01ee50593\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`favorites\` ADD CONSTRAINT \`FK_e6d445d58084164345ba85d7ab3\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reports\` ADD CONSTRAINT \`FK_9459b9bf907a3807ef7143d2ead\` FOREIGN KEY (\`reporter_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`reports\` ADD CONSTRAINT \`FK_e8fa0bffcaebc921b1e8e42a82f\` FOREIGN KEY (\`reviewed_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_dfcd8a81016d1de587fbd2d70bf\` FOREIGN KEY (\`blocker_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` ADD CONSTRAINT \`FK_7a0806a54f0ad9ced3e247cacd1\` FOREIGN KEY (\`blocked_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_7a0806a54f0ad9ced3e247cacd1\``);
        await queryRunner.query(`ALTER TABLE \`user_blocks\` DROP FOREIGN KEY \`FK_dfcd8a81016d1de587fbd2d70bf\``);
        await queryRunner.query(`ALTER TABLE \`reports\` DROP FOREIGN KEY \`FK_e8fa0bffcaebc921b1e8e42a82f\``);
        await queryRunner.query(`ALTER TABLE \`reports\` DROP FOREIGN KEY \`FK_9459b9bf907a3807ef7143d2ead\``);
        await queryRunner.query(`ALTER TABLE \`favorites\` DROP FOREIGN KEY \`FK_e6d445d58084164345ba85d7ab3\``);
        await queryRunner.query(`ALTER TABLE \`favorites\` DROP FOREIGN KEY \`FK_35a6b05ee3b624d0de01ee50593\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_a7b3e1afadd6b52f3b6864745e3\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_92e950a2513a79bb3fab273c92e\``);
        await queryRunner.query(`ALTER TABLE \`reviews\` DROP FOREIGN KEY \`FK_d524fbe85d4619f66b10a664487\``);
        await queryRunner.query(`DROP INDEX \`IDX_48667515438e7d0f0fed998b19\` ON \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_7a0806a54f0ad9ced3e247cacd\` ON \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_dfcd8a81016d1de587fbd2d70b\` ON \`user_blocks\``);
        await queryRunner.query(`DROP TABLE \`user_blocks\``);
        await queryRunner.query(`DROP INDEX \`IDX_9459b9bf907a3807ef7143d2ea\` ON \`reports\``);
        await queryRunner.query(`DROP TABLE \`reports\``);
        await queryRunner.query(`DROP INDEX \`IDX_161547c8f2db6bb2fc81de68e9\` ON \`favorites\``);
        await queryRunner.query(`DROP INDEX \`IDX_e6d445d58084164345ba85d7ab\` ON \`favorites\``);
        await queryRunner.query(`DROP INDEX \`IDX_35a6b05ee3b624d0de01ee5059\` ON \`favorites\``);
        await queryRunner.query(`DROP TABLE \`favorites\``);
        await queryRunner.query(`DROP INDEX \`IDX_bab8557ca282771fbb87c65068\` ON \`reviews\``);
        await queryRunner.query(`DROP INDEX \`IDX_a7b3e1afadd6b52f3b6864745e\` ON \`reviews\``);
        await queryRunner.query(`DROP INDEX \`IDX_d524fbe85d4619f66b10a66448\` ON \`reviews\``);
        await queryRunner.query(`DROP TABLE \`reviews\``);
    }

}
