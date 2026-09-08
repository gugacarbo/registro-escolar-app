import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1',
  dbCredentials: {
    wranglerConfigPath: './wrangler.jsonc',
    dbName: 'registro-escolar-db',
  },
})
