export const processImage = async (buffer: ArrayBuffer, mimetype: string): Promise<{ buffer: Uint8Array, mimetype: string, extension: string }> => {
    return { buffer: new Uint8Array(buffer), mimetype, extension: mimetype.split('/')[1] || 'bin' }
}
