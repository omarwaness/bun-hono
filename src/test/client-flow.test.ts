import { describe, expect, test } from "bun:test";

import { ApiKeyTable, BookTable, UserTable } from "../db/schema";
import {
    adminUser,
    apiKeyFindManyMock,
    app,
    author,
    authorFindFirstMock,
    bookFindFirstMock,
    bookFindManyMock,
    deleteMock,
    generateApiKeyMock,
    hashPasswordMock,
    insertMock,
    signMock,
    setMockApiKeyUser,
    setMockJwtUser,
    updateMock,
    user,
    userFindFirstMock,
    verifyPasswordMock,
} from "./setup";

type StoredUser = typeof user;

type StoredApiKey = {
    id: string;
    userId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    createdAt: string;
};

type StoredBook = {
    id: string;
    title: string;
    description?: string | null;
    publishDate?: string | null;
    pageCount?: number | null;
    authorId: string;
    addedBy: string;
    createdAt: string;
    author: typeof author;
};

function setupClientState(options?: {
    users?: StoredUser[];
    apiKeys?: StoredApiKey[];
    books?: StoredBook[];
}) {
    const state = {
        users: (options?.users ?? []).map(existingUser => ({ ...existingUser })),
        apiKeys: (options?.apiKeys ?? []).map(existingApiKey => ({ ...existingApiKey })),
        books: (options?.books ?? []).map(existingBook => ({ ...existingBook })),
    };

    hashPasswordMock.mockImplementation(async password => `hashed:${password}`);
    verifyPasswordMock.mockImplementation(async (password, hash) => hash === `hashed:${password}`);
    signMock.mockImplementation(async payload => `token-for-${payload.sub}`);
    generateApiKeyMock.mockImplementation(async () => {
        const index = state.apiKeys.length + 1;

        return {
            raw: `client-api-key-${index}`,
            prefix: `client-a`,
            hash: `hashed-client-api-key-${index}`,
        };
    });

    userFindFirstMock.mockImplementation(async ({ where, columns }) => {
        const matchedUser = state.users.find(existingUser => {
            if (where.email != null) {
                return existingUser.email === where.email;
            }

            if (where.id != null) {
                return existingUser.id === where.id;
            }

            return false;
        });

        if (matchedUser == null) {
            return null;
        }

        if (columns != null) {
            return {
                id: matchedUser.id,
                role: matchedUser.role,
                email: matchedUser.email,
            };
        }

        return matchedUser;
    });

    authorFindFirstMock.mockImplementation(async ({ where }) => {
        return where.id === author.id ? author : null;
    });

    apiKeyFindManyMock.mockImplementation(async ({ where }) => {
        return state.apiKeys
            .filter(existingApiKey => existingApiKey.userId === where.userId)
            .map(existingApiKey => ({
                id: existingApiKey.id,
                name: existingApiKey.name,
                keyPrefix: existingApiKey.keyPrefix,
                createdAt: existingApiKey.createdAt,
            }));
    });

    bookFindManyMock.mockImplementation(async () => {
        return state.books.map(existingBook => ({ ...existingBook }));
    });

    bookFindFirstMock.mockImplementation(async ({ where }) => {
        const matchedBook = state.books.find(existingBook => existingBook.id === where.id);
        return matchedBook == null ? null : { ...matchedBook };
    });

    insertMock.mockImplementation(table => ({
        values: (values: any) => ({
            returning: async (selection?: unknown) => {
                if (table === UserTable) {
                    const createdUser = {
                        id: `user-${state.users.length + 1}`,
                        email: values.email,
                        passwordHash: values.passwordHash,
                        role: values.role ?? "user",
                        createdAt: "2026-05-31T00:00:00.000Z",
                    };

                    state.users.push(createdUser);
                    return [createdUser];
                }

                if (table === ApiKeyTable) {
                    const createdApiKey = {
                        id: `api-key-${state.apiKeys.length + 1}`,
                        userId: values.userId,
                        name: values.name,
                        keyHash: values.keyHash,
                        keyPrefix: values.keyPrefix,
                        createdAt: "2026-05-31T00:00:00.000Z",
                    };

                    state.apiKeys.push(createdApiKey);
                    return selection == null ? [createdApiKey] : [{ id: createdApiKey.id }];
                }

                if (table === BookTable) {
                    const createdBook = {
                        id: `book-${state.books.length + 1}`,
                        title: values.title,
                        description: values.description,
                        publishDate:
                            values.publishDate instanceof Date
                                ? values.publishDate.toISOString()
                                : values.publishDate ?? null,
                        pageCount: values.pageCount ?? null,
                        authorId: values.authorId,
                        addedBy: values.addedBy,
                        createdAt: "2026-05-31T00:00:00.000Z",
                        author,
                    };

                    state.books.push(createdBook);
                    return [createdBook];
                }

                return [];
            },
        }),
    }));

    updateMock.mockImplementation(() => ({
        set: (values: any) => ({
            where: () => ({
                returning: async () => {
                    const targetBook = state.books[0];

                    if (targetBook == null) {
                        return [];
                    }

                    const updatedBook = {
                        ...targetBook,
                        ...values,
                        publishDate:
                            values.publishDate instanceof Date
                                ? values.publishDate.toISOString()
                                : values.publishDate ?? targetBook.publishDate,
                        author,
                    };

                    state.books[0] = updatedBook;
                    return [updatedBook];
                },
            }),
        }),
    }));

    deleteMock.mockImplementation(table => ({
        where: async () => {
            if (table === ApiKeyTable) {
                state.apiKeys.shift();
            }

            if (table === BookTable) {
                state.books.shift();
            }

            return undefined;
        },
    }));

    return state;
}

describe("Client flow", () => {
    test("lets a normal user move through the full client flow", async () => {
        const state = setupClientState();

        const registerResponse = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });

        expect(registerResponse.status).toBe(201);
        const registeredUser = await registerResponse.json();
        expect(registeredUser.email).toBe(user.email);

        const loginResponse = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });

        expect(loginResponse.status).toBe(200);
        const { token } = await loginResponse.json();
        expect(token).toBe(`token-for-${registeredUser.id}`);

        setMockJwtUser(registeredUser);
        setMockApiKeyUser(registeredUser);

        const unauthorizedKeyList = await app.request("/api-keys");
        expect(unauthorizedKeyList.status).toBe(401);

        const booksBeforeCreate = await app.request("/books");
        expect(booksBeforeCreate.status).toBe(200);
        expect(await booksBeforeCreate.json()).toEqual([]);

        const createApiKeyResponse = await app.request("/api-keys", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "CLI key",
            }),
        });

        expect(createApiKeyResponse.status).toBe(201);
        const createdApiKey = await createApiKeyResponse.json();
        expect(createdApiKey).toEqual({
            id: "api-key-1",
            key: "client-api-key-1",
        });

        const listApiKeysResponse = await app.request("/api-keys", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        expect(listApiKeysResponse.status).toBe(200);
        expect(await listApiKeysResponse.json()).toEqual([
            {
                id: "api-key-1",
                name: "CLI key",
                keyPrefix: "client-a",
                createdAt: "2026-05-31T00:00:00.000Z",
            },
        ]);

        const createBookWithoutKey = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title: "Pride and Prejudice",
                authorId: author.id,
            }),
        });

        expect(createBookWithoutKey.status).toBe(401);

        const createBookResponse = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": createdApiKey.key,
            },
            body: JSON.stringify({
                title: "Pride and Prejudice",
                description: "A classic novel",
                publishDate: "1813-01-28T00:00:00.000Z",
                pageCount: 432,
                authorId: author.id,
            }),
        });

        expect(createBookResponse.status).toBe(201);
        const createdBook = await createBookResponse.json();
        expect(createdBook.id).toBe("book-1");
        expect(createdBook.addedBy).toBe(registeredUser.id);

        const listBooksResponse = await app.request("/books");
        expect(listBooksResponse.status).toBe(200);
        expect(await listBooksResponse.json()).toEqual([state.books[0]]);

        const getBookResponse = await app.request(`/books/${createdBook.id}`);
        expect(getBookResponse.status).toBe(200);
        expect(await getBookResponse.json()).toEqual(state.books[0]);

        const updateBookResponse = await app.request(`/books/${createdBook.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": createdApiKey.key,
            },
            body: JSON.stringify({
                title: "Pride and Prejudice Updated",
                pageCount: 450,
            }),
        });

        expect(updateBookResponse.status).toBe(200);
        expect((await updateBookResponse.json()).title).toBe("Pride and Prejudice Updated");

        const deleteBookResponse = await app.request(`/books/${createdBook.id}`, {
            method: "DELETE",
            headers: {
                "X-API-Key": createdApiKey.key,
            },
        });

        expect(deleteBookResponse.status).toBe(204);
        expect(state.books).toEqual([]);

        const deleteApiKeyResponse = await app.request(`/api-keys/${createdApiKey.id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        expect(deleteApiKeyResponse.status).toBe(204);
        expect(state.apiKeys).toEqual([]);

        expect(insertMock).toHaveBeenCalled();
        expect(updateMock).toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalledTimes(2);
    });

    test("lets an admin log in and manage another user's book", async () => {
        const state = setupClientState({
            users: [{ ...adminUser }],
        });

        const registerUserResponse = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });
        const registeredUser = await registerUserResponse.json();

        setMockJwtUser(registeredUser);
        setMockApiKeyUser(registeredUser);

        const userLoginResponse = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });
        const { token: userToken } = await userLoginResponse.json();

        const userApiKeyResponse = await app.request("/api-keys", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${userToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "User key",
            }),
        });
        const userApiKey = await userApiKeyResponse.json();

        const userBookResponse = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": userApiKey.key,
            },
            body: JSON.stringify({
                title: "Emma",
                authorId: author.id,
            }),
        });
        const userBook = await userBookResponse.json();

        setMockJwtUser(adminUser);
        setMockApiKeyUser(adminUser);

        const adminLoginResponse = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: adminUser.email,
                password: "admin123",
            }),
        });

        expect(adminLoginResponse.status).toBe(401);

        state.users[0] = {
            ...adminUser,
            passwordHash: "hashed:admin123",
        };

        const adminLoginRetryResponse = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: adminUser.email,
                password: "admin123",
            }),
        });

        expect(adminLoginRetryResponse.status).toBe(200);
        const { token: adminToken } = await adminLoginRetryResponse.json();

        const adminApiKeyResponse = await app.request("/api-keys", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${adminToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "Admin key",
            }),
        });
        const adminApiKey = await adminApiKeyResponse.json();

        const adminListBooksResponse = await app.request("/books");
        expect(adminListBooksResponse.status).toBe(200);
        expect((await adminListBooksResponse.json())[0].id).toBe(userBook.id);

        const adminUpdateResponse = await app.request(`/books/${userBook.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": adminApiKey.key,
            },
            body: JSON.stringify({
                title: "Emma Revised by Admin",
            }),
        });

        expect(adminUpdateResponse.status).toBe(200);
        expect((await adminUpdateResponse.json()).title).toBe("Emma Revised by Admin");

        const adminDeleteResponse = await app.request(`/books/${userBook.id}`, {
            method: "DELETE",
            headers: {
                "X-API-Key": adminApiKey.key,
            },
        });

        expect(adminDeleteResponse.status).toBe(204);
        expect(state.books).toEqual([]);
    });

    test("shows common client-facing failures across the flow", async () => {
        setupClientState({
            users: [
                {
                    ...user,
                    passwordHash: "hashed:secret123",
                },
            ],
        });

        const duplicateRegisterResponse = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });

        expect(duplicateRegisterResponse.status).toBe(409);
        expect(await duplicateRegisterResponse.json()).toEqual({ error: "User already exists" });

        const invalidLoginResponse = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "wrong-password",
            }),
        });

        expect(invalidLoginResponse.status).toBe(401);
        expect(await invalidLoginResponse.json()).toEqual({ error: "Invalid password" });

        setMockJwtUser(user);
        const createApiKeyWithoutToken = await app.request("/api-keys", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "No token key",
            }),
        });

        expect(createApiKeyWithoutToken.status).toBe(401);

        setMockApiKeyUser(user);
        const createBookWithMissingAuthor = await app.request("/books", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": "client-api-key-1",
            },
            body: JSON.stringify({
                title: "Missing Author Book",
                authorId: "11111111-1111-4111-8111-111111111111",
            }),
        });

        expect(createBookWithMissingAuthor.status).toBe(400);
        expect(await createBookWithMissingAuthor.json()).toEqual({ error: "Author not found" });

        const missingBookResponse = await app.request("/books/nonexistent-book-id");
        expect(missingBookResponse.status).toBe(404);
        expect(await missingBookResponse.json()).toEqual({ error: "Book not found" });
    });
});