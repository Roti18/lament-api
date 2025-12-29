import { Hono } from 'hono'
import * as lyricsController from '../controllers/lyrics.controller'

const route = new Hono()

route.delete('/:lyricId', lyricsController.deleteLyric)

export default route
