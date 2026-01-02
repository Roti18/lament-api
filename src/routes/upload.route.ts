import { Hono } from 'hono'
import * as uploadController from '../controllers/upload.controller'

import { jwtAuth } from '../middlewares/jwt.middleware'

const route = new Hono()

route.use('/', jwtAuth)

route.post('/', uploadController.uploadFile)

export default route
