import { defineConfig } from 'prisma/config';
import path from 'path';

const DB_URL = `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: DB_URL,
  },
});
