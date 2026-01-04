import { Context } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie } from 'hono/cookie'
import { db } from '../config/db'

const SECRET = process.env.JWT_SECRET || 'lament-secret-key-change-me'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
const IS_PROD = process.env.NODE_ENV === 'production'

interface User {
    id: string
    google_id?: string
    email: string
    username?: string
    name?: string
    avatar_url?: string
    password?: string
    role?: string
}

const getRole = (email: string): string => {
    return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'
}

const generateToken = async (user: User) => {
    const role = ADMIN_EMAILS.includes(user.email.toLowerCase()) ? 'admin' : (user.role || 'user')
    const payload = {
        sub: user.id,
        email: user.email,
        role: role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    }
    return await sign(payload, SECRET)
}

const setAuthCookie = async (c: Context, token: string) => {
    await setCookie(c, 'token', token, {
        path: '/',
        secure: IS_PROD,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: IS_PROD ? 'None' : 'Lax',
    })
}

export const googleAuth = async (c: Context) => {
    try {
        // MOCK MODE: Bypass DB and Cookie to verify Vercel Edge Decoding
        // const { token } = await c.req.json()

        const mockUser = {
            id: 'mock-id-123',
            email: 'mock@ronxyz.xyz',
            name: 'Mock User',
            role: 'user',
            avatar_url: 'https://placehold.co/100'
        }

        // TEST 1: NO COOKIE
        // await setAuthCookie(c, "mock-jwt-token")

        // TEST 2: RAW RESPONSE
        return new Response(JSON.stringify({
            token: "mock-jwt-token",
            user: mockUser
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (e) {
        return new Response(JSON.stringify({ error: 'E_SERVER' }), { status: 500 })
    }
}

export const getProfile = async (c: Context) => {
    // MOCK MODE
    const mockUser = {
        id: 'mock-id-123',
        email: 'mock@ronxyz.xyz',
        name: 'Mock User',
        role: 'user',
        avatar_url: 'https://placehold.co/100'
    }

    return new Response(JSON.stringify(mockUser), {
        headers: { 'Content-Type': 'application/json' }
    })
}

export const logout = async (c: Context) => {
    await setCookie(c, 'token', '', {
        path: '/',
        secure: IS_PROD,
        httpOnly: true,
        maxAge: 0,
        sameSite: IS_PROD ? 'None' : 'Lax',
    })
    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
    })
}
