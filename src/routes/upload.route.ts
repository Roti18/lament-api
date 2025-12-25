import { Hono } from 'hono'
import * as uploadController from '../controllers/upload.controller'

const route = new Hono()

route.post('/', uploadController.uploadFile)

export default route
