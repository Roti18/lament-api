import { handle } from 'hono/vercel'
import app from '../src/index-node'

export const config = { runtime: 'nodejs' }
export default handle(app)
