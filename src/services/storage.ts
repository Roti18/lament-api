import ImageKit from 'imagekit'

// Helper to get Audio Account instance
export const getAudioIK = () => {
    // If specific audio credentials exist, use them
    if (process.env.IMAGEKIT_AUDIO_PUBLIC_KEY && process.env.IMAGEKIT_AUDIO_PRIVATE_KEY && process.env.IMAGEKIT_AUDIO_URL_ENDPOINT) {
        return new ImageKit({
            publicKey: process.env.IMAGEKIT_AUDIO_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_AUDIO_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_AUDIO_URL_ENDPOINT
        })
    }
    // Fallback to main/shared account
    return new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
    })
}

// Helper to get Image Account instance
export const getImageIK = () => {
    // If specific image credentials exist, use them
    if (process.env.IMAGEKIT_IMAGE_PUBLIC_KEY && process.env.IMAGEKIT_IMAGE_PRIVATE_KEY && process.env.IMAGEKIT_IMAGE_URL_ENDPOINT) {
        return new ImageKit({
            publicKey: process.env.IMAGEKIT_IMAGE_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_IMAGE_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_IMAGE_URL_ENDPOINT
        })
    }
    // Fallback to main/shared account
    return new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!
    })
}

/**
 * Extracts the file ID from an ImageKit URL
 * Typically IK URLs are like: https://ik.imagekit.io/user/path/to/file.png
 * But for deletion we need the File ID, which is NOT in the URL usually unless we query it.
 * 
 * HOWEVER, if we store the 'filePath' or if we can search by file name.
 * A simpler strategy for this MVP: 
 * When we save the URL in DB, we implicitly trust we can find it via Search or we should've stored the ID.
 * 
 * Since our DB schema ONLY has `cover_url` and `audio_url` (no file_id columns),
 * we must Search API to find the file ID by its name/path from the URL.
 */
export const deleteFileFromUrl = async (url: string, type: 'image' | 'audio') => {
    if (!url || !url.includes('ik.imagekit.io')) return

    const ik = type === 'audio' ? getAudioIK() : getImageIK()

    // Extract filename from URL
    // e.g. https://ik.imagekit.io/roti/covers/album.jpg -> covers/album.jpg or just album.jpg depending on config
    // Let's try to extract the last part
    const urlObj = new URL(url)
    const pathname = urlObj.pathname // /roti/covers/album.jpg

    // We need to match the file in ImageKit.
    // The safest way is to search by the filename (without the endpoint prefix)
    // But since extracting the exact path relative to IK root is tricky without knowing the exact ID mapping,
    // We will attempt to search by the file NAME.
    const fileName = pathname.split('/').pop()

    if (!fileName) return

    try {
        const files = await ik.listFiles({
            searchQuery: `name = "${fileName}"`,
            limit: 1
        })

        if (files && files.length > 0) {
            const file = files[0] as any
            const fileId = file.fileId
            await ik.deleteFile(fileId)
            console.log(`[ImageKit] Deleted ${type} file: ${fileName} (${fileId})`)
        }
    } catch (error) {
        console.error(`[ImageKit] Failed to delete ${type} file from URL ${url}:`, error)
    }
}
