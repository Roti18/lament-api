import { Hono } from 'hono'
import * as trackController from '../controllers/track.controller'
import * as lyricsController from '../controllers/lyrics.controller'
const route = new Hono()

// Custom Logic Routes
route.get('/random', trackController.getRandomTracks)

// Standard CRUD
route.get('/', trackController.listTracks)
route.get('/:id', trackController.getTrack)
route.post('/', trackController.createTrack)
route.put('/:id', trackController.updateTrack)
route.delete('/:id', trackController.deleteTrack)

// Sub-resources
route.get('/:id/lyrics', lyricsController.getLyricsByTrack)
route.post('/:id/lyrics', lyricsController.addLyricVariant)


export default route
