import ImageKit from 'imagekit'

const AUDIO_PUB = process.env.IMAGEKIT_AUDIO_PUBLIC_KEY
const AUDIO_PRV = process.env.IMAGEKIT_AUDIO_PRIVATE_KEY
const AUDIO_URL = process.env.IMAGEKIT_AUDIO_URL_ENDPOINT
const IMAGE_PUB = process.env.IMAGEKIT_IMAGE_PUBLIC_KEY
const IMAGE_PRV = process.env.IMAGEKIT_IMAGE_PRIVATE_KEY
const IMAGE_URL = process.env.IMAGEKIT_IMAGE_URL_ENDPOINT
const MAIN_PUB = process.env.IMAGEKIT_PUBLIC_KEY!
const MAIN_PRV = process.env.IMAGEKIT_PRIVATE_KEY!
const MAIN_URL = process.env.IMAGEKIT_URL_ENDPOINT!

export const getAudioIK = () => (AUDIO_PUB && AUDIO_PRV && AUDIO_URL)
    ? new ImageKit({ publicKey: AUDIO_PUB, privateKey: AUDIO_PRV, urlEndpoint: AUDIO_URL })
    : new ImageKit({ publicKey: MAIN_PUB, privateKey: MAIN_PRV, urlEndpoint: MAIN_URL })

export const getImageIK = () => (IMAGE_PUB && IMAGE_PRV && IMAGE_URL)
    ? new ImageKit({ publicKey: IMAGE_PUB, privateKey: IMAGE_PRV, urlEndpoint: IMAGE_URL })
    : new ImageKit({ publicKey: MAIN_PUB, privateKey: MAIN_PRV, urlEndpoint: MAIN_URL })

export const deleteFileFromUrl = async (url: string, type: 'image' | 'audio') => {
    if (!url || !url.includes('ik.imagekit.io')) return
    const ik = type === 'audio' ? getAudioIK() : getImageIK()
    const fileName = new URL(url).pathname.split('/').pop()
    if (!fileName) return
    try {
        const files = await ik.listFiles({ searchQuery: `name = "${fileName}"`, limit: 1 })
        if (files && files.length > 0) await ik.deleteFile((files[0] as any).fileId)
    } catch { }
}
