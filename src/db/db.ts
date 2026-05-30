import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres'
import { relations } from './relations';

export const db = drizzle({
    relations,
    connection: process.env.DATABASE_URL!
});