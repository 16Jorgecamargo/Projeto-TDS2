import { MigrationInterface, QueryRunner } from "typeorm";

export class Communication1782927016069 implements MigrationInterface {
    name = 'Communication1782927016069'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`chat_rooms\` (\`id\` varchar(36) NOT NULL, \`contract_id\` varchar(36) NULL, \`client_id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`last_message_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_7d4092a0ac81ce5d4ce46319db\` (\`client_id\`), INDEX \`IDX_cc632d105c9ce9499338417f72\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`messages\` (\`id\` varchar(36) NOT NULL, \`room_id\` varchar(36) NOT NULL, \`sender_id\` varchar(36) NOT NULL, \`content\` text NOT NULL, \`read_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_1dda4fc8dbeeff2ee71f0088ba\` (\`room_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notifications\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NOT NULL, \`channel\` enum ('push', 'in_app', 'email') NOT NULL, \`type\` varchar(64) NOT NULL, \`title\` varchar(255) NOT NULL, \`body\` text NULL, \`data\` json NULL, \`read_at\` datetime NULL, \`sent_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_9a8a82462cab47c73d25f49261\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`chat_rooms\` ADD CONSTRAINT \`FK_53b44810eaa9f00d30bb93940cc\` FOREIGN KEY (\`contract_id\`) REFERENCES \`contracts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_rooms\` ADD CONSTRAINT \`FK_7d4092a0ac81ce5d4ce46319dbd\` FOREIGN KEY (\`client_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`chat_rooms\` ADD CONSTRAINT \`FK_cc632d105c9ce9499338417f723\` FOREIGN KEY (\`professional_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_1dda4fc8dbeeff2ee71f0088ba0\` FOREIGN KEY (\`room_id\`) REFERENCES \`chat_rooms\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_22133395bd13b970ccd0c34ab22\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_9a8a82462cab47c73d25f49261f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_9a8a82462cab47c73d25f49261f\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_22133395bd13b970ccd0c34ab22\``);
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_1dda4fc8dbeeff2ee71f0088ba0\``);
        await queryRunner.query(`ALTER TABLE \`chat_rooms\` DROP FOREIGN KEY \`FK_cc632d105c9ce9499338417f723\``);
        await queryRunner.query(`ALTER TABLE \`chat_rooms\` DROP FOREIGN KEY \`FK_7d4092a0ac81ce5d4ce46319dbd\``);
        await queryRunner.query(`ALTER TABLE \`chat_rooms\` DROP FOREIGN KEY \`FK_53b44810eaa9f00d30bb93940cc\``);
        await queryRunner.query(`DROP INDEX \`IDX_9a8a82462cab47c73d25f49261\` ON \`notifications\``);
        await queryRunner.query(`DROP TABLE \`notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_1dda4fc8dbeeff2ee71f0088ba\` ON \`messages\``);
        await queryRunner.query(`DROP TABLE \`messages\``);
        await queryRunner.query(`DROP INDEX \`IDX_cc632d105c9ce9499338417f72\` ON \`chat_rooms\``);
        await queryRunner.query(`DROP INDEX \`IDX_7d4092a0ac81ce5d4ce46319db\` ON \`chat_rooms\``);
        await queryRunner.query(`DROP TABLE \`chat_rooms\``);
    }

}
