import sharp from 'sharp'

export const processImage = async (buffer: ArrayBuffer, mimetype: string): Promise<{ buffer: Buffer, mimetype: string, extension: string }> => {
    const input = Buffer.from(buffer)
    if (mimetype === 'image/webp') return { buffer: input, mimetype: 'image/webp', extension: 'webp' }
    try {
        const output = await sharp(input).webp({ quality: 80, effort: 6 }).toBuffer()
        return { buffer: output, mimetype: 'image/webp', extension: 'webp' }
    } catch {
        return { buffer: input, mimetype, extension: mimetype.split('/')[1] || 'bin' }
    }
}
