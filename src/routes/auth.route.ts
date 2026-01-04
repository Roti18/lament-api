import { Hono } from 'hono'
import { jwtAuth } from '../middlewares/jwt.middleware'

import { db } from '../config/db'

const app = new Hono()

app.get('/debug', async (c) => {
    try {
        const start = Date.now()
        const rs = await db.execute('SELECT 1 as val')
        const end = Date.now()
        return c.json({
            status: 'ok',
            latency: end - start,
            val: rs.rows[0].val,
            db_url: process.env.TURSO_DATABASE_URL?.split(':')[0],
            runtime: 'dynamic'
        })
    } catch (e: any) {
        return c.json({ status: 'error', msg: e.message }, 500)
    }
})

app.post('/google', async (c) => {
    return c.json({
        token: "inline-mock-token",
        user: {
            id: "inline-1",
            name: "Inline Mock User",
            email: "inline@test.com",
            role: "user",
            avatar_url: "https://placehold.co/100"
        }
    })
})

app.post('/logout', async (c) => {
    return c.json({ success: true })
})

// Protected Routes
app.use('/me', jwtAuth)
app.get('/me', async (c) => {
    return c.json({
        id: "inline-1",
        name: "Inline Mock User",
        email: "inline@test.com",
        role: "user",
        avatar_url: "https://placehold.co/100"
    })
})

export default app
