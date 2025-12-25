import 'dotenv/config'
import { serve } from '@hono/node-server'
// Import app instance (named export) for local dev
import { app } from './index'

const port = Number(process.env.PORT) || 3000

console.log(`Server is running on port ${port}`)

// Use the underlying Hono app, not the Vercel handler
// The handler is the default export, but we need the app instance for local dev
// Wait.. handle(app) returns a handler function, not the app instance.
// We need to export 'app' separately from src/index.ts for local dev.
serve({
    fetch: app.fetch,
    port
})
