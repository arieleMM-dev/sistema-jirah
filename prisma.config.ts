import { defineConfig } from 'prisma/config';
import path from 'path';
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const DB_URL = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node --project tsconfig.seed.json prisma/seed.ts',
  },
  datasource: {
    url: DB_URL,
  },
});
