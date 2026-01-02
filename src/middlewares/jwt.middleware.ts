
import { jwt } from 'hono/jwt'
import { getCookie } from 'hono/cookie'

const SECRET = process.env.JWT_SECRET || 'lament-secret-key-change-me'

export const jwtAuth = jwt({
    secret: SECRET,
    cookie: 'token'
})
