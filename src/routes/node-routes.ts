import { Hono } from 'hono'
import auth from './auth.route'

import requests from './request.route'
import apiKeys from './api-key.route'

const app = new Hono()

// IDENTITY & ADMIN DOMAIN (Node.js)
// Handles bcrypt, Google OAuth, and sensitive administrative tasks.
app.route('/auth', auth)
// IDENTITY & ADMIN DOMAIN (Node.js)
// Handles bcrypt, Google OAuth, and sensitive administrative tasks.
app.route('/auth', auth)
app.route('/requests', requests)
app.route('/api-keys', apiKeys)

export default app
