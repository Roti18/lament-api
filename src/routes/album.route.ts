import { Hono } from 'hono'
import * as albumController from '../controllers/album.controller'

const route = new Hono()

route.get('/', albumController.listAlbums)
route.get('/:id', albumController.getAlbum)
route.post('/', albumController.createAlbum)
route.put('/:id', albumController.updateAlbum)
route.delete('/:id', albumController.deleteAlbum)

export default route
