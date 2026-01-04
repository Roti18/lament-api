import { Hono } from 'hono'
import auth from './auth.route'
import users from './user.route'
import requests from './request.route'

import * as trackController from '../controllers/track.controller'
import * as artistController from '../controllers/artist.controller'
import * as albumController from '../controllers/album.controller'
import * as lyricsController from '../controllers/lyrics.controller'
import * as playlistController from '../controllers/playlist.controller'
import * as searchController from '../controllers/search.controller'
import * as categoryController from '../controllers/category.controller'
import * as playlistTrackController from '../controllers/playlist-track.controller'
import * as uploadController from '../controllers/upload.controller'
import * as userController from '../controllers/user.controller'
import { jwtAuth } from '../middlewares/jwt.middleware'

const app = new Hono()

app.get('/', (c) => c.json({
    name: 'lament-api',
    version: '1.0.0',
    status: 'ok',
    runtime: 'edge',
    docs: '/docs'
}))

app.get('/health', (c) => c.json({ s: 1, runtime: 'edge' }))
app.get('/ping', (c) => c.json({ pong: true, ts: Date.now() }))

// Auth Domain (Edge)
app.route('/auth', auth)
app.route('/users', users)
app.route('/requests', requests)

// Also mount at /api/* for frontend compatibility (lament.ronxyz.xyz/api/*)
app.route('/api/auth', auth)
app.route('/api/users', users)
app.route('/api/requests', requests)

// Public Read APIs (Fast + Cached)
app.get('/tracks', trackController.listTracks)
app.get('/tracks/:id', trackController.getTrack)
app.get('/tracks/:id/lyrics', lyricsController.getLyricsByTrack)
app.get('/artists', artistController.listArtists)
app.get('/artists/:id', artistController.getArtist)
app.get('/albums', albumController.listAlbums)
app.get('/albums/:id', albumController.getAlbum)
app.get('/categories', categoryController.listCategories)
app.get('/search', searchController.globalSearch)
app.get('/playlists/me', jwtAuth, playlistController.listMyPlaylists)
app.get('/playlists/:id', playlistController.getPlaylistById)

// Data Mutation APIs (Also on Edge for speed)
app.post('/tracks', trackController.createTrack)
app.put('/tracks/:id', trackController.updateTrack)
app.delete('/tracks/:id', trackController.deleteTrack)
app.post('/tracks/:id/lyrics', lyricsController.addLyricVariant)
app.delete('/lyrics/:lyricId', lyricsController.deleteLyric)

app.post('/artists', artistController.createArtist)
app.put('/artists/:id', artistController.updateArtist)
app.delete('/artists/:id', artistController.deleteArtist)

app.post('/albums', albumController.createAlbum)
app.put('/albums/:id', albumController.updateAlbum)
app.delete('/albums/:id', albumController.deleteAlbum)

app.post('/upload', uploadController.uploadFile)

// Playlist Management
app.use('/playlists/*', jwtAuth)
app.post('/playlists', playlistController.createPlaylist)
app.put('/playlists/:id', playlistController.updatePlaylist)
app.delete('/playlists/:id', playlistController.deletePlaylist)
app.post('/playlist-tracks', playlistTrackController.addTrackToPlaylist)
app.delete('/playlist-tracks', playlistTrackController.removeTrackFromPlaylist)

// User Management (Edge)
app.get('/users/me', jwtAuth, userController.getMe)
app.get('/users/:id', userController.getUser)

export default app
