import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from './index'

app.use('/docs/*', serveStatic({ root: './' }))
app.get('/docs/docs.json', async (c) => {
    try {
        const json = fs.readFileSync(path.join(process.cwd(), 'docs', 'docs.json'), 'utf-8')
        return c.json(JSON.parse(json))
    } catch {
        return c.json({ error: 'E_NF' }, 404)
    }
})

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000 })
