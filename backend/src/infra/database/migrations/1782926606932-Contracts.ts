import { MigrationInterface, QueryRunner } from "typeorm";

export class Contracts1782926606932 implements MigrationInterface {
    name = 'Contracts1782926606932'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`contracts\` (\`id\` varchar(36) NOT NULL, \`demand_id\` varchar(36) NOT NULL, \`quote_id\` varchar(36) NOT NULL, \`client_id\` varchar(36) NOT NULL, \`professional_id\` varchar(36) NOT NULL, \`total_amount\` decimal(12,2) NOT NULL, \`status\` enum ('active', 'completed', 'cancelled', 'disputed') NOT NULL DEFAULT 'active', \`started_at\` datetime NULL, \`completed_at\` datetime NULL, \`cancelled_at\` datetime NULL, \`cancelled_by\` varchar(36) NULL, \`cancellation_reason\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_d60a9cd4903db67206e229d769\` (\`demand_id\`), INDEX \`IDX_7a47f68f5d8440793d2660b937\` (\`quote_id\`), INDEX \`IDX_9945462ca96b2c7d0a97e012cd\` (\`client_id\`), INDEX \`IDX_367b6dc566093cabeeb206a98d\` (\`professional_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`schedules\` (\`id\` varchar(36) NOT NULL, \`contract_id\` varchar(36) NOT NULL, \`scheduled_date\` datetime NOT NULL, \`duration_minutes\` int NULL, \`status\` enum ('scheduled', 'confirmed', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled', \`notes\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_3202c3f070194cc585e0628689\` (\`contract_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`contract_progress_updates\` (\`id\` varchar(36) NOT NULL, \`contract_id\` varchar(36) NOT NULL, \`author_id\` varchar(36) NOT NULL, \`description\` text NOT NULL, \`percentage\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_c560a6cb791f1f1e8f73df29b0\` (\`contract_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`contract_progress_images\` (\`id\` varchar(36) NOT NULL, \`progress_update_id\` varchar(36) NOT NULL, \`image_url\` varchar(512) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_480fa46bacb0ed4e492ac1df07\` (\`progress_update_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`contract_disputes\` (\`id\` varchar(36) NOT NULL, \`contract_id\` varchar(36) NOT NULL, \`opened_by\` varchar(36) NOT NULL, \`reason\` text NOT NULL, \`status\` enum ('open', 'under_review', 'resolved', 'rejected') NOT NULL DEFAULT 'open', \`resolution\` text NULL, \`resolved_by\` varchar(36) NULL, \`resolved_at\` datetime NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_65ebdb64f57881734c52e64d40\` (\`contract_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`contracts\` ADD CONSTRAINT \`FK_d60a9cd4903db67206e229d769e\` FOREIGN KEY (\`demand_id\`) REFERENCES \`service_demands\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contracts\` ADD CONSTRAINT \`FK_7a47f68f5d8440793d2660b937b\` FOREIGN KEY (\`quote_id\`) REFERENCES \`quotes\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contracts\` ADD CONSTRAINT \`FK_9945462ca96b2c7d0a97e012cdc\` FOREIGN KEY (\`client_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contracts\` ADD CONSTRAINT \`FK_367b6dc566093cabeeb206a98d6\` FOREIGN KEY (\`professional_id\`) REFERENCES \`professional_profiles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contracts\` ADD CONSTRAINT \`FK_cc6f97236e72e44187f1c7c750c\` FOREIGN KEY (\`cancelled_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`schedules\` ADD CONSTRAINT \`FK_3202c3f070194cc585e0628689c\` FOREIGN KEY (\`contract_id\`) REFERENCES \`contracts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contract_progress_updates\` ADD CONSTRAINT \`FK_c560a6cb791f1f1e8f73df29b0e\` FOREIGN KEY (\`contract_id\`) REFERENCES \`contracts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contract_progress_updates\` ADD CONSTRAINT \`FK_60131067bffa3ba307ef7715603\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contract_progress_images\` ADD CONSTRAINT \`FK_480fa46bacb0ed4e492ac1df07a\` FOREIGN KEY (\`progress_update_id\`) REFERENCES \`contract_progress_updates\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contract_disputes\` ADD CONSTRAINT \`FK_65ebdb64f57881734c52e64d40d\` FOREIGN KEY (\`contract_id\`) REFERENCES \`contracts\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contract_disputes\` ADD CONSTRAINT \`FK_023af754163892db794743d5ae1\` FOREIGN KEY (\`opened_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`contract_disputes\` ADD CONSTRAINT \`FK_87dc347a002cd758ab2b6241bbe\` FOREIGN KEY (\`resolved_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`contract_disputes\` DROP FOREIGN KEY \`FK_87dc347a002cd758ab2b6241bbe\``);
        await queryRunner.query(`ALTER TABLE \`contract_disputes\` DROP FOREIGN KEY \`FK_023af754163892db794743d5ae1\``);
        await queryRunner.query(`ALTER TABLE \`contract_disputes\` DROP FOREIGN KEY \`FK_65ebdb64f57881734c52e64d40d\``);
        await queryRunner.query(`ALTER TABLE \`contract_progress_images\` DROP FOREIGN KEY \`FK_480fa46bacb0ed4e492ac1df07a\``);
        await queryRunner.query(`ALTER TABLE \`contract_progress_updates\` DROP FOREIGN KEY \`FK_60131067bffa3ba307ef7715603\``);
        await queryRunner.query(`ALTER TABLE \`contract_progress_updates\` DROP FOREIGN KEY \`FK_c560a6cb791f1f1e8f73df29b0e\``);
        await queryRunner.query(`ALTER TABLE \`schedules\` DROP FOREIGN KEY \`FK_3202c3f070194cc585e0628689c\``);
        await queryRunner.query(`ALTER TABLE \`contracts\` DROP FOREIGN KEY \`FK_cc6f97236e72e44187f1c7c750c\``);
        await queryRunner.query(`ALTER TABLE \`contracts\` DROP FOREIGN KEY \`FK_367b6dc566093cabeeb206a98d6\``);
        await queryRunner.query(`ALTER TABLE \`contracts\` DROP FOREIGN KEY \`FK_9945462ca96b2c7d0a97e012cdc\``);
        await queryRunner.query(`ALTER TABLE \`contracts\` DROP FOREIGN KEY \`FK_7a47f68f5d8440793d2660b937b\``);
        await queryRunner.query(`ALTER TABLE \`contracts\` DROP FOREIGN KEY \`FK_d60a9cd4903db67206e229d769e\``);
        await queryRunner.query(`DROP INDEX \`IDX_65ebdb64f57881734c52e64d40\` ON \`contract_disputes\``);
        await queryRunner.query(`DROP TABLE \`contract_disputes\``);
        await queryRunner.query(`DROP INDEX \`IDX_480fa46bacb0ed4e492ac1df07\` ON \`contract_progress_images\``);
        await queryRunner.query(`DROP TABLE \`contract_progress_images\``);
        await queryRunner.query(`DROP INDEX \`IDX_c560a6cb791f1f1e8f73df29b0\` ON \`contract_progress_updates\``);
        await queryRunner.query(`DROP TABLE \`contract_progress_updates\``);
        await queryRunner.query(`DROP INDEX \`IDX_3202c3f070194cc585e0628689\` ON \`schedules\``);
        await queryRunner.query(`DROP TABLE \`schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_367b6dc566093cabeeb206a98d\` ON \`contracts\``);
        await queryRunner.query(`DROP INDEX \`IDX_9945462ca96b2c7d0a97e012cd\` ON \`contracts\``);
        await queryRunner.query(`DROP INDEX \`IDX_7a47f68f5d8440793d2660b937\` ON \`contracts\``);
        await queryRunner.query(`DROP INDEX \`IDX_d60a9cd4903db67206e229d769\` ON \`contracts\``);
        await queryRunner.query(`DROP TABLE \`contracts\``);
    }

}
