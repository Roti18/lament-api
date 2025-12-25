import { Context } from 'hono'
import { processImage } from '../services/processor'
import { getAudioIK, getImageIK } from '../services/storage'

export const uploadFile = async (c: Context) => {
    try {
        const body = await c.req.parseBody()
        const file = body['file']
        const type = body['type'] as string

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'No file provided' }, 400)
        }

        if (!type || !['image', 'audio'].includes(type)) {
            return c.json({ error: 'Invalid upload type. Must be "image" or "audio"' }, 400)
        }

        const buffer = await file.arrayBuffer() as unknown as ArrayBuffer
        let finalBuffer = Buffer.from(buffer)
        let fileName = file.name

        // Image Processing Strategy
        if (type === 'image') {
            const processed = await processImage(buffer, file.type)
            finalBuffer = processed.buffer as any

            // Rename to .webp if it was converted
            if (processed.extension === 'webp' && !fileName.endsWith('.webp')) {
                fileName = fileName.replace(/\.[^/.]+$/, "") + ".webp"
            }
        }

        // Upload to ImageKit
        const ik = type === 'audio' ? getAudioIK() : getImageIK()
        const folder = type === 'audio' ? 'audio' : 'covers'

        const result = await ik.upload({
            file: finalBuffer, // ImageKit SDK accepts Buffer
            fileName: fileName,
            folder: folder,
            useUniqueFileName: true
        })

        return c.json({
            url: result.url,
            fileId: result.fileId,
            name: result.name,
            type: type
        })

    } catch (error: any) {
        console.error('Upload Error:', error)
        return c.json({ error: error.message }, 500)
    }
}
