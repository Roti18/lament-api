import { handle } from 'hono/vercel'
import app from '../src/app'

// Use Hono Vercel adapter handle
export default handle(app)
