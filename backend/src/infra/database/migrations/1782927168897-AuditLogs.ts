import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditLogs1782927168897 implements MigrationInterface {
    name = 'AuditLogs1782927168897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`audit_logs\` (\`id\` varchar(36) NOT NULL, \`user_id\` varchar(36) NULL, \`action\` varchar(128) NOT NULL, \`entity_type\` varchar(64) NULL, \`entity_id\` char(36) NULL, \`ip_address\` varchar(64) NULL, \`user_agent\` varchar(512) NULL, \`metadata\` json NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_bd2726fd31b35443f2245b93ba\` (\`user_id\`), INDEX \`IDX_7421efc125d95e413657efa3c6\` (\`entity_type\`, \`entity_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_bd2726fd31b35443f2245b93ba0\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_bd2726fd31b35443f2245b93ba0\``);
        await queryRunner.query(`DROP INDEX \`IDX_7421efc125d95e413657efa3c6\` ON \`audit_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_bd2726fd31b35443f2245b93ba\` ON \`audit_logs\``);
        await queryRunner.query(`DROP TABLE \`audit_logs\``);
    }

}
