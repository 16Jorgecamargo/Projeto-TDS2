import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../infra/database/data-source.js';
import { User } from '../infra/database/entities/user.entity.js';

const BCRYPT_ROUNDS = 12;

async function main(): Promise<void> {
  const [email, password, name, phone] = process.argv.slice(2);
  if (!email || !password || !name || !phone) {
    throw new Error('usage: seed-e2e-admin.ts <email> <password> <name> <phone>');
  }

  await AppDataSource.initialize();
  const users = AppDataSource.getRepository(User);

  const existing = await users.findOne({ where: { email } });
  if (existing) {
    await users.delete({ id: existing.id });
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const entity = users.create({
    full_name: name,
    email,
    phone,
    password_hash,
    role: 'admin',
  });
  const saved = await users.save(entity);

  process.stdout.write(JSON.stringify({ id: saved.id }));
  await AppDataSource.destroy();
}

main().catch((error) => {
  process.stderr.write(String(error?.stack ?? error));
  process.exitCode = 1;
});
