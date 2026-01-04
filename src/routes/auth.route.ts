import { Hono } from 'hono'
import { register, login, googleAuth, getProfile, logout } from '../controllers/auth.controller'
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

app.post('/register', register)
app.post('/login', login)
app.post('/google', googleAuth)
app.post('/logout', logout)

// Protected Routes
app.use('/me', jwtAuth)
app.get('/me', getProfile)

export default app
