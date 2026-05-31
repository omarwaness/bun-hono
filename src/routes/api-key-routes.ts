import "dotenv/config";
import z from "zod";

import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { sValidator } from "@hono/standard-validator";

import { db } from "../db/db";
import { and, eq } from "drizzle-orm";
import { ApiKeyTable } from "../db/schema";
import { generateApiKey } from "../lib/crypto";

type JwtEnv = {
    Variables: {
        jwtPayload: { sub: string; email: string; exp: number }
    }
}

const createKeySchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
})

const app = new Hono<JwtEnv>()

app.use(jwt({ secret: process.env.JWT_SECRET!, alg: "HS256" }));

app.get('/', async (c) => {
    const { sub: userId } = c.var.jwtPayload

    const keys = await db.query.ApiKeyTable.findMany({
        where: { userId },
        columns: {
            id: true,
            name: true,
            keyPrefix: true,
            createdAt: true,
        },
    })

    return c.json(keys)
})

app.post("/", sValidator("json", createKeySchema), async c => {
    const { sub: userId } = c.var.jwtPayload
    const { name } = c.req.valid("json")
    const { hash, prefix, raw } = await generateApiKey()

    const [apiKey] = await db
        .insert(ApiKeyTable)
        .values({ name, userId, keyHash: hash, keyPrefix: prefix })
        .returning({ id: ApiKeyTable.id })

    return c.json({ key: raw, id: apiKey.id }, 201)
})

app.delete("/:id", async c => {
    const { sub: userId } = c.var.jwtPayload
    const id = c.req.param("id")

    await db
        .delete(ApiKeyTable)
        .where(and(eq(ApiKeyTable.id, id), eq(ApiKeyTable.userId, userId)))

    return c.body(null, 204)
})

export default app;