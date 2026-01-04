import { Hono } from 'hono'

import requests from './request.route'

import apiKeys from './api-key.route'

const app = new Hono()

app.route('/requests', requests)
app.route('/api-keys', apiKeys)

export default app
