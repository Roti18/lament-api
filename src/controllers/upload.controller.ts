import { Context } from 'hono'
import { processImage } from '../services/processor'
import { uploadToImageKit } from '../services/storage'

export const uploadFile = async (c: Context) => {
    try {
        const body = await c.req.parseBody()
        const file = body['file']
        const type = body['type'] as string

        // Permission Check
        const user = c.get('jwtPayload')
        if (type === 'audio' && user?.role !== 'admin') {
            return c.json({ error: 'E_PERM', message: 'Only admins can upload tracks' }, 403)
        }

        if (!file || !(file instanceof File)) return c.json({ error: 'E_FILE' }, 400)
        if (!type || !['image', 'audio'].includes(type)) return c.json({ error: 'E_TYPE' }, 400)

        const buffer = await file.arrayBuffer()
        let finalData: Uint8Array | ArrayBuffer = new Uint8Array(buffer)
        let fileName = file.name

        if (type === 'image') {
            const processed = await processImage(buffer, file.type)
            finalData = processed.buffer
            if (processed.extension === 'webp' && !fileName.endsWith('.webp')) {
                fileName = fileName.replace(/\.[^/.]+$/, '') + '.webp'
            }
        }

        const folder = type === 'audio' ? '/lament/music' : '/lament/images'
        const result = await uploadToImageKit(finalData, fileName, folder)

        return c.json({ url: result.url, fileId: result.fileId, name: result.name, type })
    } catch {
        return c.json({ error: 'E_UP' }, 500)
    }
}
