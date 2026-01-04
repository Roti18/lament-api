import { Hono } from 'hono'
import { googleAuth, getProfile, logout } from '../controllers/auth.controller'
import { jwtAuth } from '../middlewares/jwt.middleware'
import { db } from '../config/db'

const app = new Hono()

// Debug endpoint to test DB+Edge connectivity
app.get('/debug', async (c) => {
    try {
        const start = Date.now()
        const rs = await db.execute('SELECT 1 as val')
        const end = Date.now()
        return c.json({
            status: 'ok',
            latency: end - start,
            val: rs.rows[0].val,
            runtime: 'edge'
        })
    } catch (e: any) {
        return c.json({ status: 'error', msg: e.message }, 500)
    }
})

// Auth Endpoints
app.post('/google', googleAuth)
app.post('/logout', logout)

// Protected Routes
app.use('/me', jwtAuth)
app.get('/me', getProfile)

export default app
