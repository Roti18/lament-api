// Image processor - Edge-compatible (no sharp)
// Images are passed through as-is, ImageKit handles optimization on their CDN

export const processImage = async (buffer: ArrayBuffer, mimetype: string): Promise<{ buffer: Uint8Array, mimetype: string, extension: string }> => {
    // For Edge runtime, we skip local processing
    // ImageKit will optimize images automatically on upload/delivery
    return {
        buffer: new Uint8Array(buffer),
        mimetype,
        extension: mimetype.split('/')[1] || 'bin'
    }
}
