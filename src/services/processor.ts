// Image processor - Edge-compatible using ImageKit URL transformations
// Docs: https://docs.imagekit.io/features/image-transformations

const PRESETS = {
    thumbnail: 'tr=w-150,h-150,fo-auto,q-80,f-webp',
    cover: 'tr=w-400,h-400,fo-auto,q-80,f-webp',
    coverLarge: 'tr=w-800,h-800,fo-auto,q-85,f-webp',
    artist: 'tr=w-300,h-300,fo-face,q-80,f-webp',
    artistLarge: 'tr=w-600,h-600,fo-face,q-85,f-webp',
    banner: 'tr=w-1200,h-400,fo-auto,q-85,f-webp',
    original: 'tr=q-90,f-webp'  // Just optimize, no resize
}

export type ImagePreset = keyof typeof PRESETS

/**
 * Transform ImageKit URL with optimization parameters
 * @param url Original ImageKit URL
 * @param preset Transformation preset
 * @returns Optimized URL with transformations
 */
export const optimizeImageUrl = (url: string | null | undefined, preset: ImagePreset = 'cover'): string | null => {
    if (!url) return null
    if (!url.includes('ik.imagekit.io')) return url // Not an ImageKit URL

    const transform = PRESETS[preset]

    // Check if URL already has transformations
    if (url.includes('?tr=')) {
        return url // Already transformed
    }

    // Add transformation
    return url.includes('?') ? `${url}&${transform}` : `${url}?${transform}`
}

/**
 * Generate srcset for responsive images
 * @param url Original ImageKit URL
 * @param widths Array of widths
 * @returns srcset string
 */
export const generateSrcSet = (url: string | null | undefined, widths: number[] = [300, 600, 900, 1200]): string | null => {
    if (!url) return null
    if (!url.includes('ik.imagekit.io')) return null

    return widths
        .map(w => `${url}?tr=w-${w},q-80,f-webp ${w}w`)
        .join(', ')
}

// For upload: just pass through, ImageKit handles optimization on delivery
export const processImage = async (buffer: ArrayBuffer, mimetype: string): Promise<{ buffer: Uint8Array, mimetype: string, extension: string }> => {
    return {
        buffer: new Uint8Array(buffer),
        mimetype,
        extension: mimetype.split('/')[1] || 'bin'
    }
}
