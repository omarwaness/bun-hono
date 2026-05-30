import { beforeEach, describe, expect, jest, mock, test } from "bun:test";

const findManyMock = jest.fn();
const findFirstMock = jest.fn();
const insertReturningMock = jest.fn();
const insertValuesMock = jest.fn(() => ({ returning: insertReturningMock }));
const insertMock = jest.fn(() => ({ values: insertValuesMock }));
const updateReturningMock = jest.fn();
const updateWhereMock = jest.fn(() => ({ returning: updateReturningMock }));
const updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
const updateMock = jest.fn(() => ({ set: updateSetMock }));
const deleteWhereMock = jest.fn();
const deleteMock = jest.fn(() => ({ where: deleteWhereMock }));

const dbMock = {
    query: {
        AuthorTable: {
            findMany: findManyMock,
            findFirst: findFirstMock,
        },
    },
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
};

mock.module("../db/db", () => ({
    db: dbMock,
}));

const { default: app } = await import("../index");

const author = {
    id: "96400b77-cb2f-4529-b8b4-297ba18b02df",
    name: "Jane Austen",
    birthdate: "1775-12-16T00:00:00.000Z",
    createdAt: "2026-05-30T00:00:00.000Z",
};

beforeEach(() => {
    mock.clearAllMocks();

    findManyMock.mockResolvedValue([]);
    findFirstMock.mockResolvedValue(null);
    insertReturningMock.mockResolvedValue([author]);
    updateReturningMock.mockResolvedValue([author]);
    deleteWhereMock.mockResolvedValue(undefined);
});

describe("GET /authors", () => {
    test("returns all authors", async () => {
        findManyMock.mockResolvedValue([author]);

        const response = await app.request("/authors");

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([author]);
        expect(findManyMock).toHaveBeenCalledTimes(1);
    });

    test("returns an empty array when there are no authors", async () => {
        const response = await app.request("/authors");

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });
});

describe("GET /authors/:id", () => {
    test("returns the matching author", async () => {
        findFirstMock.mockResolvedValue(author);

        const response = await app.request(`/authors/${author.id}`);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(author);
        expect(findFirstMock).toHaveBeenCalledTimes(1);
    });

    test("returns 404 when the author does not exist", async () => {
        const response = await app.request("/authors/missing-id");

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Author not found" });
    });
});

describe("POST /authors", () => {
    test("creates an author", async () => {
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
        updateReturningMock.mockResolvedValue([]);

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