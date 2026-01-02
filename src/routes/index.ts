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
import search from './search.route'
import lyrics from './lyric.route'
import playlists from './playlist.route'
import requests from './request.route'
import auth from './auth.route'

const app = new Hono()

app.route('/tracks', tracks)
app.route('/artists', artists)
app.route('/albums', albums)
app.route('/categories', categories)
app.route('/users', users)
app.route('/api-keys', apiKeys)
app.route('/track-categories', trackCategories)
app.route('/playlist-tracks', playlistTracks)
app.route('/playlists', playlists)
app.route('/upload', upload)
app.route('/search', search)
app.route('/lyrics', lyrics)
app.route('/requests', requests)
app.route('/auth', auth)

export default app
