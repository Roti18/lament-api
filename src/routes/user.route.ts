import { Hono } from 'hono'
import * as userController from '../controllers/user.controller'

const route = new Hono()

route.get('/', userController.listUsers)
route.get('/:id', userController.getUser)

export default route
