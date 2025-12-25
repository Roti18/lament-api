import { handle } from 'hono/vercel'
import app from '../src/app'

// Hapus export config - biarkan Vercel yang tentukan
export default handle(app)
