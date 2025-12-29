import { Hono } from 'hono'
import * as trackController from '../controllers/track.controller'
import * as lyricsController from '../controllers/lyrics.controller'

const route = new Hono()

route.get('/', trackController.listTracks)
route.get('/:id', trackController.getTrack)
route.post('/', trackController.createTrack)
route.put('/:id', trackController.updateTrack)
route.delete('/:id', trackController.deleteTrack)
route.get('/:id/lyrics', lyricsController.getLyricsByTrack)
route.post('/:id/lyrics', lyricsController.addLyricVariant)

export default route
