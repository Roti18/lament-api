import { Hono } from 'hono'
import * as artistController from '../controllers/artist.controller'

const route = new Hono()

route.get('/', artistController.listArtists)
route.get('/:id', artistController.getArtist)
route.post('/', artistController.createArtist)
route.put('/:id', artistController.updateArtist)
route.delete('/:id', artistController.deleteArtist)

export default route
