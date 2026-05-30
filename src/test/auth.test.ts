import { describe, expect, test } from "bun:test";

import {
    app,
    hashPasswordMock,
    insertMock,
    insertReturningMock,
    insertValuesMock,
    signMock,
    user,
    userFindFirstMock,
    verifyPasswordMock,
} from "./setup";

describe("POST /auth/register", () => {
    test("creates a user when the email is available", async () => {
        insertReturningMock.mockResolvedValue([user]);

        const response = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(user);
        expect(userFindFirstMock).toHaveBeenCalledTimes(1);
        expect(hashPasswordMock).toHaveBeenCalledWith("secret123");
        expect(insertMock).toHaveBeenCalledTimes(1);
        expect(insertValuesMock).toHaveBeenCalledWith({
            email: user.email,
            passwordHash: "hashed-password",
        });
    });

    test("returns 409 when the user already exists", async () => {
        userFindFirstMock.mockResolvedValue(user);

        const response = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({ error: "User already exists" });
        expect(hashPasswordMock).not.toHaveBeenCalled();
        expect(insertMock).not.toHaveBeenCalled();
    });

    test("rejects invalid registration payloads", async () => {
        const response = await app.request("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "not-an-email",
                password: "123",
            }),
        });

        expect(response.status).toBe(400);
        expect(userFindFirstMock).not.toHaveBeenCalled();
    });
});

describe("POST /auth/login", () => {
    test("returns a signed token for valid credentials", async () => {
        userFindFirstMock.mockResolvedValue(user);

        const response = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ token: "signed-jwt-token" });
        expect(verifyPasswordMock).toHaveBeenCalledWith("secret123", user.passwordHash);
        expect(signMock).toHaveBeenCalledWith(
            expect.objectContaining({
                email: user.email,
                exp: expect.any(Number),
                sub: user.id,
            }),
            "test-secret"
        );
    });

    test("returns 401 when the user does not exist", async () => {
        const response = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "secret123",
            }),
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "User not found" });
        expect(verifyPasswordMock).not.toHaveBeenCalled();
        expect(signMock).not.toHaveBeenCalled();
    });

    test("returns 401 when the password is invalid", async () => {
        userFindFirstMock.mockResolvedValue(user);
        verifyPasswordMock.mockResolvedValue(false);

        const response = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: user.email,
                password: "wrong-password",
            }),
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Invalid password" });
        expect(signMock).not.toHaveBeenCalled();
    });

    test("rejects invalid login payloads", async () => {
        const response = await app.request("/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: "",
                password: "",
            }),
        });

        expect(response.status).toBe(400);
        expect(userFindFirstMock).not.toHaveBeenCalled();
    });
});