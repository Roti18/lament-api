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
        const { token } = await c.req.json()

        if (!token) return c.json({ error: 'E_MISSING_TOKEN' }, 400)

        // Native Fetch to Google (Edge Compatible)
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`)

        if (!googleRes.ok) {
            const err = await googleRes.json() as any
            console.error('Google Auth Error:', err)
            return c.json({ error: 'E_INVALID_GOOGLE_TOKEN', details: err }, 401)
        }

        const payload = await googleRes.json() as any

        if (!payload || !payload.email) {
            return c.json({ error: 'E_INVALID_GOOGLE_TOKEN' }, 401)
        }

        const googleId = payload.sub
        const email = payload.email
        const name = payload.name
        const avatar = payload.picture

        let rs = await db.execute({
            sql: "SELECT * FROM users WHERE google_id = ? OR email = ?",
            args: [googleId, email]
        })

        let user: User

        if (rs.rows.length === 0) {
            const id = crypto.randomUUID()
            const role = getRole(email)

            await db.execute({
                sql: "INSERT INTO users (id, google_id, email, name, avatar_url, provider, username, role) VALUES (?, ?, ?, ?, ?, 'google', ?, ?)",
                args: [id, googleId, email, name || '', avatar || '', email.split('@')[0], role]
            })
            user = { id, google_id: googleId, email, role }
        } else {
            user = rs.rows[0] as unknown as User
            if (!user.google_id || user.avatar_url !== avatar) {
                await db.execute({
                    sql: "UPDATE users SET google_id = ?, provider = 'google', avatar_url = ? WHERE id = ?",
                    args: [googleId, avatar || '', user.id]
                })
            }
        }

        const jwtToken = await generateToken(user)
        await setAuthCookie(c, jwtToken)

        const { password: _, ...safeUser } = user
        return c.json({ token: jwtToken, user: safeUser })

    } catch (e) {
        return c.json({ error: 'E_AUTH_FAILED' }, 401)
    }
}

export const getProfile = async (c: Context) => {
    const payload = c.get('jwtPayload')
    if (!payload) return c.json({ error: 'Unauthorized' }, 401)

    const rs = await db.execute({
        sql: "SELECT id, google_id, email, username, name, avatar_url, role FROM users WHERE id = ?",
        args: [payload.sub]
    })

    if (rs.rows.length === 0) return c.json({ error: 'User not found' }, 404)
    return c.json(rs.rows[0])
}

export const logout = async (c: Context) => {
    await setCookie(c, 'token', '', {
        path: '/',
        secure: IS_PROD,
        httpOnly: true,
        maxAge: 0,
        sameSite: IS_PROD ? 'None' : 'Lax',
    })
    return c.json({ success: true })
}
