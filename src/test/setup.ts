import { beforeEach, jest, mock } from "bun:test";

export const authorFindManyMock = jest.fn();
export const authorFindFirstMock = jest.fn();
export const apiKeyFindManyMock = jest.fn();
export const bookFindManyMock = jest.fn();
export const bookFindFirstMock = jest.fn();
export const userFindFirstMock = jest.fn();
export const insertReturningMock = jest.fn();
export const insertValuesMock = jest.fn(() => ({ returning: insertReturningMock }));
export const insertMock = jest.fn(() => ({ values: insertValuesMock }));
export const updateReturningMock = jest.fn();
export const updateWhereMock = jest.fn(() => ({ returning: updateReturningMock }));
export const updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
export const updateMock = jest.fn(() => ({ set: updateSetMock }));
export const deleteWhereMock = jest.fn();
export const deleteMock = jest.fn(() => ({ where: deleteWhereMock }));
export const generateApiKeyMock = jest.fn();
export const hashPasswordMock = jest.fn();
export const verifyPasswordMock = jest.fn();
export const signMock = jest.fn();

export const user = {
    id: "d0e4a9d2-eacf-4437-b48b-6d6296f18eb5",
    email: "jane@example.com",
    passwordHash: "hashed-password",
    role: "user",
    createdAt: "2026-05-30T00:00:00.000Z",
};

export const adminUser = {
    id: "b2ef2bb0-d5c1-4f06-834a-0fd96482d190",
    email: "admin@example.com",
    passwordHash: "hashed-admin-password",
    role: "admin",
    createdAt: "2026-05-30T00:00:00.000Z",
};

let jwtAuthUser = user;
let apiKeyAuthUser = user;

export function setMockJwtUser(nextUser: typeof user) {
    jwtAuthUser = nextUser;
}

export function setMockApiKeyUser(nextUser: typeof user) {
    apiKeyAuthUser = nextUser;
}

const dbMock = {
    query: {
        AuthorTable: {
            findMany: authorFindManyMock,
            findFirst: authorFindFirstMock,
        },
        ApiKeyTable: {
            findMany: apiKeyFindManyMock,
        },
        BookTable: {
            findMany: bookFindManyMock,
            findFirst: bookFindFirstMock,
        },
        UserTable: {
            findFirst: userFindFirstMock,
        },
    },
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
};

mock.module("../db/db", () => ({
    db: dbMock,
}));

mock.module("../lib/crypto", () => ({
    generateApiKey: generateApiKeyMock,
    hashPassword: hashPasswordMock,
    verifyPassword: verifyPasswordMock,
}));

mock.module("../middleware/auth", () => ({
    apiKeyAuth: async (c: any, next: () => Promise<void>) => {
        const apiKeyHeader = c.req.header("X-API-Key");

        if (apiKeyHeader == null || apiKeyHeader.trim() === "") {
            return c.json({ error: "Missing API Key" }, 401);
        }

        c.set("apiKeyUser", {
            id: apiKeyAuthUser.id,
            role: apiKeyAuthUser.role,
            email: apiKeyAuthUser.email,
        });

        await next();
    },
}));

mock.module("hono/jwt", () => ({
    jwt: jest.fn(() => async (c: any, next: () => Promise<void>) => {
        const authorization = c.req.header("Authorization");

        if (!authorization?.startsWith("Bearer ")) {
            return c.json({ message: "Unauthorized" }, 401);
        }

        c.set("jwtPayload", {
            sub: jwtAuthUser.id,
            email: jwtAuthUser.email,
            exp: Math.floor(Date.now() / 1000) + 300,
        });

        await next();
    }),
    sign: signMock,
}));

process.env.JWT_SECRET = "test-secret";

export const { default: app } = await import("../index");

export const author = {
    id: "96400b77-cb2f-4529-b8b4-297ba18b02df",
    name: "Jane Austen",
    birthdate: "1775-12-16T00:00:00.000Z",
    createdAt: "2026-05-30T00:00:00.000Z",
};

export const apiKey = {
    id: "2ee59820-60f5-4f92-9730-3dd266c2d324",
    name: "Local development",
    keyPrefix: "ak_live_",
    createdAt: "2026-05-30T00:00:00.000Z",
};

export const book = {
    id: "fef519bb-df11-4a68-a2c1-42f526651db3",
    title: "Pride and Prejudice",
    description: "A classic novel",
    publishDate: "1813-01-28T00:00:00.000Z",
    pageCount: 432,
    authorId: author.id,
    addedBy: user.id,
    createdAt: "2026-05-30T00:00:00.000Z",
    author,
};

beforeEach(() => {
    mock.clearAllMocks();

    authorFindManyMock.mockResolvedValue([]);
    authorFindFirstMock.mockResolvedValue(null);
    apiKeyFindManyMock.mockResolvedValue([]);
    bookFindManyMock.mockResolvedValue([]);
    bookFindFirstMock.mockResolvedValue(null);
    userFindFirstMock.mockResolvedValue(null);
    insertReturningMock.mockResolvedValue([]);
    updateReturningMock.mockResolvedValue([]);
    deleteWhereMock.mockResolvedValue(undefined);
    generateApiKeyMock.mockResolvedValue({
        raw: "ak_live_test_key",
        prefix: "ak_live_",
        hash: "hashed-api-key",
    });
    hashPasswordMock.mockResolvedValue("hashed-password");
    verifyPasswordMock.mockResolvedValue(true);
    signMock.mockResolvedValue("signed-jwt-token");
    setMockJwtUser(user);
    setMockApiKeyUser(user);
    user.role = "user";
});