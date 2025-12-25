import 'dotenv/config'
import { createClient, Client } from '@libsql/client'

let db: Client

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

if (url) {
    db = createClient({
        url,
        authToken: token || ''
    })
} else {
    // Create a dummy client that throws meaningful errors instead of crashing on import
    console.error('[DB] TURSO_DATABASE_URL is not defined! Database operations will fail.')
    db = {
        execute: async () => { throw new Error('Database not configured: TURSO_DATABASE_URL missing') },
        batch: async () => { throw new Error('Database not configured') },
        transaction: async () => { throw new Error('Database not configured') },
        executeMultiple: async () => { throw new Error('Database not configured') },
        sync: async () => { },
        close: () => { }
    } as any
}

export { db }
