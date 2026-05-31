import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, r => ({
    ApiKeyTable: {
        user: r.one.UserTable({
            from: r.ApiKeyTable.userId,
            to: r.UserTable.id,
        }),
    },
    UserTable: {
        apiKeys: r.many.ApiKeyTable(),
    },
}));