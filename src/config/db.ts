import { createClient, Client } from '@libsql/client'

let db: Client

const url = typeof process !== 'undefined' ? process.env?.TURSO_DATABASE_URL : undefined
const token = typeof process !== 'undefined' ? process.env?.TURSO_AUTH_TOKEN : undefined

if (url) {
    db = createClient({
        url,
        authToken: token || ''
    })
} else {
    console.error('[DB] TURSO_DATABASE_URL is not set!')
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
