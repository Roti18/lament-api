import { handle } from 'hono/vercel'
import app from '../src/app'

// Pastikan pakai Node.js karena kita butuh Sharp
export const config = {
    runtime: 'nodejs'
}

export default handle(app)
