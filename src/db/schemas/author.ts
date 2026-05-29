import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const authorsTable = pgTable("authors", {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    birthdate: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
