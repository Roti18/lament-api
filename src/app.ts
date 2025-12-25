import { Hono } from "hono"

const app = new Hono()

// ULTRA MINIMAL - NO IMPORTS, NO MIDDLEWARE
app.get('/', (c) => c.text('Lament API - Minimal Mode'))
app.get('/test', (c) => c.json({ status: 'ok', time: Date.now() }))

// Kalau ini jalan, masalah di import lain
export default app
