import { describe, expect, test } from "bun:test";

import {
    apiKey,
    apiKeyFindManyMock,
    app,
    deleteMock,
    deleteWhereMock,
    generateApiKeyMock,
    insertMock,
    insertReturningMock,
    insertValuesMock,
    user,
} from "./setup";

describe("GET /api-keys", () => {
    test("returns the authenticated user's api keys", async () => {
        apiKeyFindManyMock.mockResolvedValue([apiKey]);

        const response = await app.request("/api-keys", {
            headers: {
                Authorization: "Bearer test-token",
            },
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([apiKey]);
        expect(apiKeyFindManyMock).toHaveBeenCalledTimes(1);
        expect(apiKeyFindManyMock).toHaveBeenCalledWith({
            where: { userId: user.id },
            columns: {
                id: true,
                name: true,
                keyPrefix: true,
                createdAt: true,
            },
        });
    });

    test("returns an empty array when the user has no api keys", async () => {
        const response = await app.request("/api-keys", {
            headers: {
                Authorization: "Bearer test-token",
            },
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });

    test("returns 401 when the request is missing a bearer token", async () => {
        const response = await app.request("/api-keys");

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ message: "Unauthorized" });
        expect(apiKeyFindManyMock).not.toHaveBeenCalled();
    });
});

describe("POST /api-keys", () => {
    test("creates an api key for the authenticated user", async () => {
        insertReturningMock.mockResolvedValue([{ id: apiKey.id }]);

        const response = await app.request("/api-keys", {
            method: "POST",
            headers: {
                Authorization: "Bearer test-token",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: apiKey.name,
            }),
        });

        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({
            id: apiKey.id,
            key: "ak_live_test_key",
        });
        expect(generateApiKeyMock).toHaveBeenCalledTimes(1);
        expect(insertMock).toHaveBeenCalledTimes(1);
        expect(insertValuesMock).toHaveBeenCalledWith({
            name: apiKey.name,
            userId: user.id,
            keyHash: "hashed-api-key",
            keyPrefix: "ak_live_",
        });
    });

    test("rejects invalid payloads", async () => {
        const response = await app.request("/api-keys", {
            method: "POST",
            headers: {
                Authorization: "Bearer test-token",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "",
            }),
        });

        expect(response.status).toBe(400);
        expect(generateApiKeyMock).not.toHaveBeenCalled();
        expect(insertMock).not.toHaveBeenCalled();
    });
});

describe("DELETE /api-keys/:id", () => {
    test("deletes an api key for the authenticated user", async () => {
        const response = await app.request(`/api-keys/${apiKey.id}`, {
            method: "DELETE",
            headers: {
                Authorization: "Bearer test-token",
            },
        });

        expect(response.status).toBe(204);
        expect(await response.text()).toBe("");
        expect(deleteMock).toHaveBeenCalledTimes(1);
        expect(deleteWhereMock).toHaveBeenCalledTimes(1);
    });
});