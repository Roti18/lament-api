import { handle } from 'hono/vercel'
import app from '../src/app'

// Node.js runtime untuk support fs (docs serving)
export const config = {
    runtime: 'nodejs'
}

export default handle(app)
