export const processImage = async (buffer: ArrayBuffer, mimetype: string): Promise<{ buffer: Buffer, mimetype: string, extension: string }> => {
    const input = Buffer.from(buffer)
    return { buffer: input, mimetype, extension: mimetype.split('/')[1] || 'bin' }
}
