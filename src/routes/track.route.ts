import { Hono } from 'hono'
import * as trackController from '../controllers/track.controller'

const route = new Hono()

route.get('/', trackController.listTracks)
route.get('/:id', trackController.getTrack)
route.post('/', trackController.createTrack)
route.put('/:id', trackController.updateTrack)
route.delete('/:id', trackController.deleteTrack)

export default route
