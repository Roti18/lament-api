import { Hono } from 'hono'
import * as apiKeyController from '../controllers/api-key.controller'

const route = new Hono()

route.get('/', apiKeyController.listApiKeys)
route.get('/:id', apiKeyController.getApiKey)

export default route
