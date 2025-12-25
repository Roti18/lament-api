import { Context, Next } from 'hono'

export const authMiddleware = async (c: Context, next: Next) => {
    const apiKey = c.req.header('x-api-key') || c.req.header('X-API-KEY')
    const masterKey = process.env.MASTER_KEY

    console.log('API Key received:', apiKey ? 'YES' : 'NO')

    if (!apiKey) {
        return c.json({ error: 'Missing API Key' }, 401)
    }

    // DEBUG: Allow everything if it has ANY key
    console.log('Bypassing DB check for debugging')
    return await next()
}
