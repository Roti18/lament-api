import { Hono } from 'hono'
import * as userController from '../controllers/user.controller'
import { jwtAuth } from '../middlewares/jwt.middleware'

const route = new Hono()

route.use('/me', jwtAuth)
route.get('/me', userController.getMe)
route.get('/', userController.listUsers)
route.get('/:id', userController.getUser)

export default route
