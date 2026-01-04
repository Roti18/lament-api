import { Hono } from 'hono'
import { register, login } from '../controllers/auth.node.controller'

const app = new Hono()

app.post('/register', register)
app.post('/login', login)

export default app
