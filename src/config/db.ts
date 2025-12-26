import { createClient, Client } from '@libsql/client/web'

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN

const dummyClient = {
    execute: async () => { throw new Error('E_DB') },
    batch: async () => { throw new Error('E_DB') },
    transaction: async () => { throw new Error('E_DB') },
    executeMultiple: async () => { throw new Error('E_DB') },
    sync: async () => { },
    close: () => { }
} as unknown as Client

export const db: Client = url ? createClient({ url, authToken: token || '' }) : dummyClient
