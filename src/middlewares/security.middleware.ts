import { Context, Next } from "hono";
import { secureHeaders } from "hono/secure-headers";

export const securityHeadersMockSelector = secureHeaders();

export const securityHardening = async (c: Context, next: Next) => {
    // Allow multipart/form-data for uploads, strict JSON for others could be added here
    // For now, we just ensure headers are clean

    await next();

    c.res.headers.delete("X-Powered-By");
};
