import { Hono } from 'hono'
import tracks from './track.route'
import artists from './artist.route'
import albums from './album.route'
import categories from './category.route'
import users from './user.route'
import apiKeys from './api-key.route'
import trackCategories from './track-category.route'
import playlistTracks from './playlist-track.route'
import upload from './upload.route'

const app = new Hono()

app.route('/tracks', tracks)
app.route('/artists', artists)
app.route('/albums', albums)
app.route('/categories', categories)
app.route('/users', users)
app.route('/api-keys', apiKeys)
app.route('/track-categories', trackCategories)
app.route('/playlist-tracks', playlistTracks)
app.route('/upload', upload)

export default app
