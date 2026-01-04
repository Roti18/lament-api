import { Hono } from 'hono'
import authNode from './auth-node.route'
import requests from './request.route'
import apiKeys from './api-key.route'

const app = new Hono()

// IDENTITY & ADMIN DOMAIN (Node.js)
// Handles bcrypt (Login/Register) and sensitive administrative tasks.
app.route('/auth', authNode)
app.route('/requests', requests)
app.route('/api-keys', apiKeys)

export default app
