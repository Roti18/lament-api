import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({
    name: 'lament-api',
    version: '1.0.0',
    status: 'ok',
    runtime: 'edge',
    docs: '/docs'
}))

app.get('/docs', (c) => c.json({
    auth: 'All endpoints require x-api-key header',
    endpoints: {
        tracks: { list: 'GET /tracks', get: 'GET /tracks/:id', create: 'POST /tracks', update: 'PUT /tracks/:id', delete: 'DELETE /tracks/:id' },
        artists: { list: 'GET /artists', get: 'GET /artists/:id', create: 'POST /artists', update: 'PUT /artists/:id', delete: 'DELETE /artists/:id' },
        albums: { list: 'GET /albums', get: 'GET /albums/:id', create: 'POST /albums', update: 'PUT /albums/:id', delete: 'DELETE /albums/:id' },
        categories: { list: 'GET /categories', get: 'GET /categories/:id', create: 'POST /categories' },
        upload: { audio: 'POST /upload (multipart, type=audio)', image: 'POST /upload (multipart, type=image)' },
        lyrics: { list: 'GET /tracks/:id/lyrics', add: 'POST /tracks/:id/lyrics', delete: 'DELETE /lyrics/:lyricId' }
    }
}))

app.get('/health', (c) => c.json({ s: 1, runtime: 'edge' }))

export default app
