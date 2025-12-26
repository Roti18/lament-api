import { Context } from 'hono'
import { processImage } from '../services/processor'
import { uploadToImageKit } from '../services/storage'

export const uploadFile = async (c: Context) => {
    try {
        const body = await c.req.parseBody()
        const file = body['file']
        const type = body['type'] as string

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

        const folder = type === 'audio' ? 'audio' : 'covers'
        const result = await uploadToImageKit(finalData, fileName, folder, type as 'audio' | 'image')

        return c.json({ url: result.url, fileId: result.fileId, name: result.name, type })
    } catch {
        return c.json({ error: 'E_UP' }, 500)
    }
}
