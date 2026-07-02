import 'reflect-metadata';
import { AppDataSource } from '../infra/database/data-source.js';
import { ServiceCategory } from '../infra/database/entities/service-category.entity.js';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  const categories = AppDataSource.getRepository(ServiceCategory);

  const existing = await categories.findOne({ where: { slug: 'e2e-seed-category' } });
  if (existing) {
    process.stdout.write(JSON.stringify({ id: existing.id }));
    await AppDataSource.destroy();
    return;
  }

  const entity = categories.create({
    parent_id: null,
    name: 'Categoria E2E',
    slug: 'e2e-seed-category',
    icon: null,
    description: 'Categoria semeada para testes e2e',
    is_active: true,
  });
  const saved = await categories.save(entity);

  process.stdout.write(JSON.stringify({ id: saved.id }));
  await AppDataSource.destroy();
}

main().catch((error) => {
  process.stderr.write(String(error?.stack ?? error));
  process.exitCode = 1;
});
