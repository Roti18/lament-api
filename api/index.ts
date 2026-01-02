import { handle } from 'hono/vercel'
import app from '../src/index-edge'

export const config = { runtime: 'edge' }
export default handle(app)
