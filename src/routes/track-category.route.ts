import { Hono } from 'hono'
import * as trackCategoryController from '../controllers/track-category.controller'

const route = new Hono()

route.get('/', trackCategoryController.listTrackCategories)

export default route
