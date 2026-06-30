import { defineConfig } from 'drizzle-kit';

// Drizzle Kit config — `npm -w @ingame/api run db:generate` emits the committed migration SQL +
// journal into ./drizzle (reviewed in the PR; F28 will CI-check the journal matches generate output).
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://ingame:ingame@localhost:5432/local_ingame',
  },
});
