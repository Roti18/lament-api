
const PROTECTED_PATHS = [
    '/tracks', '/artists', '/albums', '/categories',
    '/users', '/api-keys', '/upload', '/search',
    '/lyrics', '/playlists', '/playlist-tracks', '/requests'
]

export default function middleware(request: Request) {
    const url = new URL(request.url)
    const pathname = url.pathname


    const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path))

    if (isProtected) {
        const apiKey = request.headers.get('x-api-key')

        const cookies = request.headers.get('cookie') || ''
        const hasToken = cookies.includes('token=')
        const authHeader = request.headers.get('authorization')


        if (!apiKey && !hasToken && !authHeader) {
            return new Response(
                JSON.stringify({ error: 'E_UNAUTHORIZED_EDGE', message: 'Missing authentication' }),
                { status: 401, headers: { 'content-type': 'application/json' } }
            )
        }
    }


    return new Response(null, {
        headers: {
            'x-middleware-next': '1',
        },
    })
}


export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
