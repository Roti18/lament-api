import 'dotenv/config'
import { createClient } from '@libsql/client'

if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL IS UNDEFINED')
}

export const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || ''
})
