import { describe, expect, test } from "bun:test";

import {
    app,
    author,
    authorFindFirstMock,
    authorFindManyMock,
    deleteMock,
    deleteWhereMock,
    insertMock,
    insertReturningMock,
    insertValuesMock,
    updateMock,
    updateReturningMock,
    updateSetMock,
} from "./setup";

describe("GET /authors", () => {
    test("returns all authors", async () => {
        authorFindManyMock.mockResolvedValue([author]);

        const response = await app.request("/authors");

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([author]);
        expect(authorFindManyMock).toHaveBeenCalledTimes(1);
    });

    test("returns an empty array when there are no authors", async () => {
        const response = await app.request("/authors");

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });
});

describe("GET /authors/:id", () => {
    test("returns the matching author", async () => {
        authorFindFirstMock.mockResolvedValue(author);

        const response = await app.request(`/authors/${author.id}`);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(author);
        expect(authorFindFirstMock).toHaveBeenCalledTimes(1);
    });

    test("returns 404 when the author does not exist", async () => {
        const response = await app.request("/authors/missing-id");

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Author not found" });
    });
});

describe("POST /authors", () => {
    test("creates an author", async () => {
        insertReturningMock.mockResolvedValue([author]);

        const response = await app.request("/authors", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: author.name,
                birthdate: author.birthdate,
            }),
        });

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(author);
        expect(insertMock).toHaveBeenCalledTimes(1);
        expect(insertValuesMock).toHaveBeenCalledWith({
            name: author.name,
            birthdate: expect.any(Date),
        });
    });

    test("rejects invalid payloads", async () => {
        const response = await app.request("/authors", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "",
            }),
        });

        expect(response.status).toBe(400);
        expect(insertMock).not.toHaveBeenCalled();
    });
});

describe("PUT /authors/:id", () => {
    test("updates an author", async () => {
        const updatedAuthor = { ...author, name: "Updated Name" };
        updateReturningMock.mockResolvedValue([updatedAuthor]);

        const response = await app.request(`/authors/${author.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: updatedAuthor.name,
            }),
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(updatedAuthor);
        expect(updateSetMock).toHaveBeenCalledWith({ name: updatedAuthor.name });
    });

    test("returns 404 when updating a missing author", async () => {
        const response = await app.request(`/authors/${author.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "Updated Name",
            }),
        });

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Author not found" });
    });

    test("rejects invalid update payloads", async () => {
        const response = await app.request(`/authors/${author.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "",
            }),
        });

        expect(response.status).toBe(400);
        expect(updateMock).not.toHaveBeenCalled();
    });
});

describe("DELETE /authors/:id", () => {
    test("deletes an author", async () => {
        const response = await app.request(`/authors/${author.id}`, {
            method: "DELETE",
        });

        expect(response.status).toBe(204);
        expect(await response.text()).toBe("");
        expect(deleteMock).toHaveBeenCalledTimes(1);
        expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    });

    test("still returns 204 when no author was deleted", async () => {
        deleteWhereMock.mockResolvedValue({ rowCount: 0 });

        const response = await app.request("/authors/missing-id", {
            method: "DELETE",
        });

        expect(response.status).toBe(204);
        expect(await response.text()).toBe("");
    });
});