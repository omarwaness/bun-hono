import { Hono } from "hono";

import z from "zod";
import { sValidator } from "@hono/standard-validator";

import { eq } from "drizzle-orm";
 import { db } from "../db/db";
import { authorsTable } from "../db/schema";


const app = new Hono();

const createAuthorSchema = z.object({
    name: z.string().min(1, "Name is required"),
    birthdate: z.coerce.date().optional(),
})

const updateAuthorSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    birthdate: z.coerce.date().optional(),
})

app.get('/', async (c) => {
    const authors = await db.select().from(authorsTable);
    return c.json(authors);
})

app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const [author] = await db
        .select()
        .from(authorsTable)
        .where(eq(authorsTable.id, id))
        .limit(1);

    if (!author) {
        return c.text('Author not found', 404);
    }

    return c.json(author);
})

app.post('/', sValidator("json", createAuthorSchema), async (c) => {
    const data = c.req.valid("json");

    const [newAuthor] = await db.insert(authorsTable).values({
        name: data.name,
        birthdate: data.birthdate ?? new Date(),
    }).returning();

    return c.json(newAuthor, 201);
})

app.put('/:id', sValidator("json", updateAuthorSchema), async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid("json");

    const updateData = {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.birthdate !== undefined ? { birthdate: data.birthdate } : {}),
    };

    const [author] = await db
        .update(authorsTable)
        .set(updateData)
        .where(eq(authorsTable.id, id))
        .returning();

    if (!author) {
        return c.text('Author not found', 404);
    }

    return c.json(author);
})

app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const [author] = await db
        .delete(authorsTable)
        .where(eq(authorsTable.id, id))
        .returning({ id: authorsTable.id });

    if (!author) {
        return c.text('Author not found', 404);
    }

    return c.body(null, 204);
})

export default app;