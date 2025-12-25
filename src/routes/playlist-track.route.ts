import { Hono } from 'hono'
import * as playlistTrackController from '../controllers/playlist-track.controller'

const route = new Hono()

route.get('/', playlistTrackController.listPlaylistTracks)

export default route
