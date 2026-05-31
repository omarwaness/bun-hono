
export async function hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
}

export async function generateApiKey(): Promise<{ raw: string; prefix: string; hash: string }> {
    const raw = crypto.randomUUID().replaceAll("-", "");
    const prefix = raw.slice(0, 8);
    const hash = await Bun.password.hash(raw);

    return { raw, prefix, hash };
}

export async function hashApiKey(apiKey: string): Promise<string> {
    return Bun.password.hash(apiKey);
}