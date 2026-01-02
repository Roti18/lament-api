import { Hono } from 'hono'
import * as playlistTrackController from '../controllers/playlist-track.controller'

import { jwtAuth } from '../middlewares/jwt.middleware'

const route = new Hono()

route.use('*', jwtAuth)

route.get('/', playlistTrackController.listPlaylistTracks)
route.post('/', playlistTrackController.addTrackToPlaylist)
route.delete('/:id', playlistTrackController.removeTrackFromPlaylist)

export default route
