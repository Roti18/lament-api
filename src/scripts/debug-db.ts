import { createClient } from '@libsql/client/web';
import 'dotenv/config';

async function check() {
    const url = process.env.TURSO_DATABASE_URL!;
    const authToken = process.env.TURSO_AUTH_TOKEN!;

    console.log('Connecting to:', url);
    const client = createClient({ url, authToken });

    try {
        console.log('--- Checking tables ---');
        const TABLES = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tables:', TABLES.rows.map(r => r.name));

        console.log('--- Checking requests table ---');
        const COLS = await client.execute("PRAGMA table_info(requests)");
        console.log('Columns:', COLS.rows);

        console.log('--- Test Query ---');
        // Test the exact query that is failing
        await client.execute({
            sql: "SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC",
            args: ["test-user-id"]
        });
        console.log('Query success!');

    } catch (e) {
        console.error('ERROR:', e);
    }
}

check();
