import { Hono } from 'hono'
import auth from './auth.route'

import requests from './request.route'
import { db } from '../config/db'
import apiKeys from './api-key.route'

const app = new Hono()

app.get('/debug-db', async (c) => {
    try {
        const start = Date.now()
        const rs = await db.execute('SELECT 1 as val')
        const end = Date.now()
        return c.json({ status: 'ok', latency: end - start, val: rs.rows[0].val, url_type: process.env.TURSO_DATABASE_URL?.split(':')[0] })
    } catch (e: any) {
        return c.json({ status: 'error', msg: e.message, type: e.constructor.name }, 500)
    }
})

// IDENTITY & ADMIN DOMAIN (Node.js)
// Handles bcrypt, Google OAuth, and sensitive administrative tasks.
app.route('/auth', auth)
// IDENTITY & ADMIN DOMAIN (Node.js)
// Handles bcrypt, Google OAuth, and sensitive administrative tasks.
app.route('/auth', auth)
app.route('/requests', requests)
app.route('/api-keys', apiKeys)

export default app
