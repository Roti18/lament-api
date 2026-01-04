import { Context } from 'hono'
import { setCookie } from 'hono/cookie'

const IS_PROD = process.env.NODE_ENV === 'production'

// MOCK IMPLEMENTATION (CLEAN)
export const googleAuth = async (c: Context) => {
    const mockUser = {
        id: 'mock-id-final',
        email: 'mock@ronxyz.xyz',
        name: 'Mock User Final',
        role: 'user',
        avatar_url: 'https://placehold.co/100'
    }

    // Try setting cookie again? No, keep it minimal first.
    // await setCookie(c, 'token', 'mock-token', { path: '/', httpOnly: true })

    return c.json({
        token: "mock-jwt-token-final",
        user: mockUser
    })
}

export const getProfile = async (c: Context) => {
    return c.json({
        id: 'mock-id-final',
        email: 'mock@ronxyz.xyz',
        name: 'Mock User Final',
        role: 'user',
        avatar_url: 'https://placehold.co/100'
    })
}

export const logout = async (c: Context) => {
    return c.json({ success: true })
}
