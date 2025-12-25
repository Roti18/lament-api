import sharp from 'sharp'

export const processImage = async (buffer: ArrayBuffer, mimetype: string): Promise<{ buffer: Buffer, mimetype: string, extension: string }> => {
    // Convert ArrayBuffer to Buffer
    const inputBuffer = Buffer.from(buffer)

    // Check if it's already WebP
    if (mimetype === 'image/webp') {
        return {
            buffer: inputBuffer,
            mimetype: 'image/webp',
            extension: 'webp'
        }
    }

    try {
        // Convert to WebP using Sharp
        const outputBuffer = await sharp(inputBuffer)
            .webp({ quality: 80, effort: 6 }) // Compress with good quality
            .toBuffer()

        return {
            buffer: outputBuffer,
            mimetype: 'image/webp',
            extension: 'webp'
        }
    } catch (error) {
        console.error('Sharp processing error:', error)
        // Fallback: return original if processing fails
        return {
            buffer: inputBuffer,
            mimetype: mimetype,
            extension: mimetype.split('/')[1] || 'bin'
        }
    }
}
