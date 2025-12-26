import fs from 'node:fs'
import path from 'node:path'
import { db } from "../config/db"

const run = async () => {
    console.log("[INFO] Running database migrations...")
    try {
        const schemaPath = path.join(process.cwd(), 'schema.sql')
        if (!fs.existsSync(schemaPath)) {
            throw new Error("schema.sql not found at root")
        }

        const sqlContent = fs.readFileSync(schemaPath, 'utf-8')
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0)

        for (const sql of statements) {
            console.log(`[EXEC] ${sql.substring(0, 50)}...`)
            await db.execute(sql)
        }

        console.log("[INFO] Migrations completed successfully.")
        process.exit(0)
    } catch (error) {
        console.error("[ERROR] Migration failed:", error)
        process.exit(1)
    }
}

run()
