import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { config } from '../config.js';

const sql = postgres(config.DATABASE_URL, { max: 10 });

export const db = drizzle(sql, { schema });

export type DB = typeof db;
/** Tipo del objeto de transacción que recibe el callback de db.transaction() */
export type TX = Parameters<Parameters<typeof db.transaction>[0]>[0];
