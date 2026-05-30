import { beforeEach, jest, mock } from "bun:test";

export const authorFindManyMock = jest.fn();
export const authorFindFirstMock = jest.fn();
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
export const hashPasswordMock = jest.fn();
export const verifyPasswordMock = jest.fn();
export const signMock = jest.fn();

const dbMock = {
    query: {
        AuthorTable: {
            findMany: authorFindManyMock,
            findFirst: authorFindFirstMock,
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
    hashPassword: hashPasswordMock,
    verifyPassword: verifyPasswordMock,
}));

mock.module("hono/jwt", () => ({
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

export const user = {
    id: "d0e4a9d2-eacf-4437-b48b-6d6296f18eb5",
    email: "jane@example.com",
    passwordHash: "hashed-password",
    role: "user",
    createdAt: "2026-05-30T00:00:00.000Z",
};

beforeEach(() => {
    mock.clearAllMocks();

    authorFindManyMock.mockResolvedValue([]);
    authorFindFirstMock.mockResolvedValue(null);
    userFindFirstMock.mockResolvedValue(null);
    insertReturningMock.mockResolvedValue([]);
    updateReturningMock.mockResolvedValue([]);
    deleteWhereMock.mockResolvedValue(undefined);
    hashPasswordMock.mockResolvedValue("hashed-password");
    verifyPasswordMock.mockResolvedValue(true);
    signMock.mockResolvedValue("signed-jwt-token");
});