import { Hono } from "hono";

import 'dotenv/config';
import z from "zod";
import { sValidator } from "@hono/standard-validator";

import { db } from "../db/db";
import { UserTable } from "../db/schema"
import { hashPassword, verifyPassword } from "../lib/crypto";
import { sign } from "hono/jwt";


const JWT_EXPIRATION_SECONDS = 5 * 60; // 5 minutes

const app = new Hono();

const registerSchema = z.object({
    email: z.email().min(1, "Email is required"),
    password: z.string().min(6, "Password is required"),
})

const loginSchema = z.object({
    email: z.email().min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
})


app.post('/register', sValidator("json", registerSchema), async (c) => {
    const { email, password } = c.req.valid("json")

    const existing = await db.query.UserTable.findFirst({ where: { email } })
    if (existing) {
        return c.json({ error: "User already exists" }, 409)
    }

    const hashedPassword = await hashPassword(password)
    const [user] = await db
        .insert(UserTable)
        .values({ email, passwordHash: hashedPassword })
        .returning()

    return c.json(user, 201)
})

app.post('/login', sValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json")

    const user = await db.query.UserTable.findFirst({ where: { email } })
    if (!user) {
        return c.json({ error: "User not found" }, 401)
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
        return c.json({ error: "Invalid password" }, 401)
    }

    const now = Math.floor(Date.now() / 1000)
    const token = await sign(
        { exp: now + JWT_EXPIRATION_SECONDS, sub: user.id, email: user.email },
        process.env.JWT_SECRET!
    )

    return c.json({ token })
})

export default app;