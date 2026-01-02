import { Hono } from 'hono'
import { createRequest, listRequests, getMyRequests, updateRequestStatus } from '../controllers/request.controller'
import { jwtAuth } from '../middlewares/jwt.middleware'

const app = new Hono()

app.use('*', jwtAuth)

app.post('/', createRequest)
app.get('/', listRequests)
app.get('/me', getMyRequests)
app.put('/:id/status', updateRequestStatus)

export default app
