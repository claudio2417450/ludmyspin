import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from '../config.js';

const sql = postgres(config.DATABASE_URL, { max: 1 });
const db = drizzle(sql);

await migrate(db, { migrationsFolder: new URL('./migrations', import.meta.url).pathname });
console.log('Migraciones aplicadas.');
await sql.end();
