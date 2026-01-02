import { Hono } from 'hono'
import { register, login, googleAuth, getProfile, logout } from '../controllers/auth.controller'
import { jwtAuth } from '../middlewares/jwt.middleware'

const app = new Hono()

app.post('/register', register)
app.post('/login', login)
app.post('/google', googleAuth)
app.post('/logout', logout)

// Protected Routes
app.use('/me', jwtAuth)
app.get('/me', getProfile)

export default app
