import { describe, expect, test } from "bun:test";

import {
    app,
    author,
    authorFindFirstMock,
    book,
    bookFindFirstMock,
    bookFindManyMock,
    deleteMock,
    deleteWhereMock,
    insertMock,
    insertReturningMock,
    insertValuesMock,
    updateMock,
    updateReturningMock,
    updateSetMock,
    user,
} from "./setup";

describe("GET /books", () => {
    test("returns all books with their author", async () => {
        bookFindManyMock.mockResolvedValue([book]);

        const response = await app.request("/books");

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([book]);
        expect(bookFindManyMock).toHaveBeenCalledTimes(1);
        expect(bookFindManyMock).toHaveBeenCalledWith({ with: { author: true } });
    });

    test("returns an empty array when there are no books", async () => {
        const response = await app.request("/books");

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });
});

describe("GET /books/:id", () => {
    test("returns the matching book with its author", async () => {
        bookFindFirstMock.mockResolvedValue(book);

        const response = await app.request(`/books/${book.id}`);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(book);
        expect(bookFindFirstMock).toHaveBeenCalledWith({
            where: { id: book.id },
            with: { author: true },
        });
    });

    test("returns 404 when the book does not exist", async () => {
        const response = await app.request("/books/missing-id");

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Book not found" });
    });
});

describe("POST /books", () => {
    test("creates a book for a valid author", async () => {
        authorFindFirstMock.mockResolvedValue(author);
        insertReturningMock.mockResolvedValue([book]);

        const response = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "test-api-key",
            },
            body: JSON.stringify({
                title: book.title,
                description: book.description,
                publishDate: book.publishDate,
                pageCount: book.pageCount,
                authorId: book.authorId,
            }),
        });

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(book);
        expect(authorFindFirstMock).toHaveBeenCalledWith({ where: { id: book.authorId } });
        expect(insertMock).toHaveBeenCalledTimes(1);
        expect(insertValuesMock).toHaveBeenCalledWith({
            title: book.title,
            description: book.description,
            publishDate: expect.any(Date),
            pageCount: book.pageCount,
            authorId: book.authorId,
            addedBy: user.id,
        });
    });

    test("returns 400 when the author does not exist", async () => {
        const response = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "test-api-key",
            },
            body: JSON.stringify({
                title: book.title,
                authorId: book.authorId,
            }),
        });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Author not found" });
        expect(insertMock).not.toHaveBeenCalled();
    });

    test("rejects invalid payloads", async () => {
        const response = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "test-api-key",
            },
            body: JSON.stringify({
                title: "",
                authorId: "not-a-uuid",
            }),
        });

        expect(response.status).toBe(400);
        expect(authorFindFirstMock).not.toHaveBeenCalled();
        expect(insertMock).not.toHaveBeenCalled();
    });

    test("returns 401 when the api key is missing", async () => {
        const response = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: book.title,
                authorId: book.authorId,
            }),
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Missing API Key" });
        expect(insertMock).not.toHaveBeenCalled();
    });
});

describe("PUT /books/:id", () => {
    test("updates a book owned by the authenticated user", async () => {
        const updatedBook = { ...book, title: "Sense and Sensibility" };
        updateReturningMock.mockResolvedValue([updatedBook]);

        const response = await app.request(`/books/${book.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "test-api-key",
            },
            body: JSON.stringify({
                title: updatedBook.title,
            }),
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(updatedBook);
        expect(updateSetMock).toHaveBeenCalledWith({ title: updatedBook.title });
    });

    test("allows admins to update a book", async () => {
        user.role = "admin";
        const updatedBook = { ...book, pageCount: 500 };
        updateReturningMock.mockResolvedValue([updatedBook]);

        const response = await app.request(`/books/${book.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "test-api-key",
            },
            body: JSON.stringify({
                pageCount: updatedBook.pageCount,
            }),
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual(updatedBook);
        expect(updateSetMock).toHaveBeenCalledWith({ pageCount: updatedBook.pageCount });
    });

    test("returns 400 when updating to a missing author", async () => {
        const response = await app.request(`/books/${book.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "test-api-key",
            },
            body: JSON.stringify({
                authorId: book.authorId,
            }),
        });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Author not found" });
        expect(updateMock).not.toHaveBeenCalled();
    });

    test("returns 404 when the book does not exist", async () => {
        const response = await app.request(`/books/${book.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "test-api-key",
            },
            body: JSON.stringify({
                title: "Updated Title",
            }),
        });

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual("Book not found");
    });

    test("returns 401 when updating without an api key", async () => {
        const response = await app.request(`/books/${book.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: "Updated Title",
            }),
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Missing API Key" });
        expect(updateMock).not.toHaveBeenCalled();
    });
});

describe("DELETE /books/:id", () => {
    test("deletes a book owned by the authenticated user", async () => {
        const response = await app.request(`/books/${book.id}`, {
            method: "DELETE",
            headers: {
                "X-API-Key": "test-api-key",
            },
        });

        expect(response.status).toBe(204);
        expect(await response.text()).toBe("");
        expect(deleteMock).toHaveBeenCalledTimes(1);
        expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    });

    test("allows admins to delete a book", async () => {
        user.role = "admin";

        const response = await app.request(`/books/${book.id}`, {
            method: "DELETE",
            headers: {
                "X-API-Key": "test-api-key",
            },
        });

        expect(response.status).toBe(204);
        expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    });

    test("returns 401 when deleting without an api key", async () => {
        const response = await app.request(`/books/${book.id}`, {
            method: "DELETE",
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Missing API Key" });
        expect(deleteMock).not.toHaveBeenCalled();
    });
});