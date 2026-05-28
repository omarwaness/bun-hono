import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import z from "zod";

const app = new Hono();

const authors = [
    { id: 1, name: "Alice", birthdate: new Date("1990-01-01") },
    { id: 2, name: "Bob", birthdate: new Date("1985-05-15") },
    { id: 3, name: "Charlie", birthdate: new Date("2000-12-31") },
]

const createAuthorSchema = z.object({
    name: z.string().min(1, "Name is required"),
    birthdate: z.coerce.date().optional(),
})

const updateAuthorSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    birthdate: z.coerce.date().optional(),
})

app.get('/', (c) => {
    return c.json(authors);
})

app.get('/:id', (c) => {
    const id = c.req.param('id');
    const author = authors.find(a => a.id === Number(id));

    if (!author) {
        return c.text('Author not found', 404);
    }

    return c.json(author);
})

app.post('/', sValidator("json", createAuthorSchema), (c) => {
    const data = c.req.valid("json");

    const newAuthor = {
        id: authors.length + 1,
        name: data.name,
        birthdate: data.birthdate || new Date(),
    }

    authors.push(newAuthor);
    return c.json(newAuthor, 201);
})

app.put('/:id', sValidator("json", updateAuthorSchema), (c) => {
    const id = c.req.param('id');
    const data = c.req.valid("json");

    const author = authors.find(a => a.id === Number(id));
    if (!author) {
        return c.text('Author not found', 404);
    }

    if (data.name) {
        author.name = data.name;
    }
    if (data.birthdate) {
        author.birthdate = data.birthdate;
    }

    return c.json(author);
})

app.delete('/:id', (c) => {
    const id = c.req.param('id');
    const index = authors.findIndex(a => a.id === Number(id));

    if (index === -1) {
        return c.text('Author not found', 404);
    }

    authors.splice(index, 1);
    return c.body(null, 204);
})

export default app;