
import { Hono } from 'hono'
import { jwtAuth } from '../middlewares/jwt.middleware'
import * as playlistController from '../controllers/playlist.controller'

const route = new Hono()

route.use('*', jwtAuth)

route.post('/', playlistController.createPlaylist)
route.get('/me', playlistController.listMyPlaylists)
route.get('/:id', playlistController.getPlaylistById)
route.put('/:id', playlistController.updatePlaylist)
route.delete('/:id', playlistController.deletePlaylist)

export default route
