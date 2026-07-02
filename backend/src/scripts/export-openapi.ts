import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildApp } from '../app.js';

const OUTPUT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../openapi.json',
);

async function main(): Promise<void> {
  const app = await buildApp();
  await app.ready();

  const document = app.swagger();
  await writeFile(OUTPUT_PATH, JSON.stringify(document, null, 2));

  await app.close();
  process.stdout.write(`OpenAPI document written to ${OUTPUT_PATH}\n`);
}

main().catch((error) => {
  process.stderr.write(String(error?.stack ?? error));
  process.exitCode = 1;
});
