const AUDIO_PRV = process.env.IMAGEKIT_AUDIO_PRIVATE_KEY
const AUDIO_URL = process.env.IMAGEKIT_AUDIO_URL_ENDPOINT
const IMAGE_PRV = process.env.IMAGEKIT_IMAGE_PRIVATE_KEY
const IMAGE_URL = process.env.IMAGEKIT_IMAGE_URL_ENDPOINT
const MAIN_PRV = process.env.IMAGEKIT_PRIVATE_KEY!
const MAIN_URL = process.env.IMAGEKIT_URL_ENDPOINT!

const getCredentials = (type: 'audio' | 'image') => {
    if (type === 'audio' && AUDIO_PRV && AUDIO_URL) {
        return { privateKey: AUDIO_PRV, urlEndpoint: AUDIO_URL }
    }
    if (type === 'image' && IMAGE_PRV && IMAGE_URL) {
        return { privateKey: IMAGE_PRV, urlEndpoint: IMAGE_URL }
    }
    return { privateKey: MAIN_PRV, urlEndpoint: MAIN_URL }
}

const authHeader = (privateKey: string) => 'Basic ' + btoa(privateKey + ':')

interface UploadResult {
    url: string
    fileId: string
    name: string
}

export const uploadToImageKit = async (
    file: Uint8Array | ArrayBuffer,
    fileName: string,
    folder: string,
    type: 'audio' | 'image'
): Promise<UploadResult> => {
    const { privateKey } = getCredentials(type)

    const bytes = file instanceof Uint8Array ? file : new Uint8Array(file)
    const base64 = btoa(String.fromCharCode(...bytes))

    const formData = new FormData()
    formData.append('file', base64)
    formData.append('fileName', fileName)
    formData.append('folder', folder)
    formData.append('useUniqueFileName', 'true')

    const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        headers: { 'Authorization': authHeader(privateKey) },
        body: formData
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`ImageKit upload failed: ${err}`)
    }

    const data = await res.json() as { url: string; fileId: string; name: string }
    return { url: data.url, fileId: data.fileId, name: data.name }
}

export const deleteFileFromUrl = async (url: string, type: 'image' | 'audio') => {
    if (!url || !url.includes('ik.imagekit.io')) return

    const { privateKey } = getCredentials(type)
    const fileName = new URL(url).pathname.split('/').pop()
    if (!fileName) return

    try {
        const searchRes = await fetch(
            `https://api.imagekit.io/v1/files?searchQuery=name="${fileName}"&limit=1`,
            { headers: { 'Authorization': authHeader(privateKey) } }
        )

        if (!searchRes.ok) return

        const files = await searchRes.json() as { fileId: string }[]
        if (!files || files.length === 0) return

        await fetch(`https://api.imagekit.io/v1/files/${files[0].fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': authHeader(privateKey) }
        })
    } catch { }
}
