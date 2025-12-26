import { Hono } from 'hono'
import * as searchController from '../controllers/search.controller'

const route = new Hono()

route.get('/', searchController.globalSearch)

export default route
