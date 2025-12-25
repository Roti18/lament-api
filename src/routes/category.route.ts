import { Hono } from 'hono'
import * as categoryController from '../controllers/category.controller'

const route = new Hono()

route.get('/', categoryController.listCategories)
route.get('/:id', categoryController.getCategory)
route.post('/', categoryController.createCategory)
route.put('/:id', categoryController.updateCategory)
route.delete('/:id', categoryController.deleteCategory)

export default route
