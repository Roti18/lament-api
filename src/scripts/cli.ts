import { db } from "../config/db";

// Simple UUID generator if 'uuid' package isn't available or for zero-dep
const genUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

const args = process.argv.slice(2);
const command = args[0];
const target = args[1];
const extra = args[2];
const restParams = args.slice(2);

const help = () => {
    console.log(`
Database CLI Manager

Usage: npm run db:do <command> <target> [options]

Commands:
  list-tables                       : Show all tables
  drop-table <table>                : Delete a table permanently
  clear-table <table>               : Delete all rows in a table
  list-rows <table>                 : View first 50 rows
  insert <table> key=val key2=val   : Insert a new row (auto-generates id if missing)
  update <table> <id> key=val       : Update a row by ID
  delete-row <table> <id>           : Delete a specific row by ID
  query <sql>                       : Run a raw SQL query (use quotes)

Examples:
  npm run db:do insert items name="My Item" description="Cool"
  npm run db:do update items <id> name="New Name"
`);
};

const parseKeyValue = (params: string[]) => {
    const data: Record<string, any> = {};
    params.forEach((p) => {
        const [key, ...valParts] = p.split("=");
        if (key && valParts.length > 0) {
            let val = valParts.join("=");
            // Remove surrounding quotes if present
            if (
                (val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))
            ) {
                val = val.slice(1, -1);
            }
            data[key] = val;
        }
    });
    return data;
};

// Elegant Table Printer
const printTable = (rows: any[]) => {
    if (rows.length === 0) {
        console.log("No records found.");
        return;
    }

    const headers = Object.keys(rows[0]);
    const colWidths = headers.map((h) =>
        Math.max(h.length, ...rows.map((r) => String(r[h] || "").length)),
    );

    // Header
    console.log(
        headers.map((h, i) => h.toUpperCase().padEnd(colWidths[i])).join("  "),
    );
    console.log(headers.map((h, i) => "-".repeat(colWidths[i])).join("  "));

    // Rows
    rows.forEach((row) => {
        console.log(
            headers
                .map((h, i) => {
                    let val = String(row[h] || "");
                    // Truncate long values for elegance
                    if (val.length > 50) val = val.substring(0, 47) + "...";
                    return val.padEnd(colWidths[i]);
                })
                .join("  "),
        );
    });
    console.log(""); // Spacer
};

const run = async () => {
    try {
        switch (command) {
            case "list-tables": {
                const res = await db.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                );
                console.log("\n📂 TABLES");
                console.log("---------");
                res.rows.forEach((r) => console.log(r.name));
                console.log("");
                break;
            }

            case "drop-table": {
                if (!target) throw new Error("Table name required");
                await db.execute(`DROP TABLE IF EXISTS ${target}`);
                console.log(`Table '${target}' dropped.`);
                break;
            }

            case "clear-table": {
                if (!target) throw new Error("Table name required");
                await db.execute(`DELETE FROM ${target}`);
                console.log(`Table '${target}' cleared.`);
                break;
            }

            case "list-rows": {
                if (!target) throw new Error("Table name required");
                const res = await db.execute(
                    `SELECT * FROM ${target} ORDER BY created_at DESC LIMIT 50`,
                );
                console.log(`\nVIEW: ${target} (Limit 50)\n`);
                printTable(res.rows);
                break;
            }

            case "insert": {
                if (!target) throw new Error("Table name required");
                const data = parseKeyValue(restParams);
                if (Object.keys(data).length === 0)
                    throw new Error("No data provided (key=value)");

                // Auto-generate ID if not provided
                if (!data.id) {
                    data.id = genUUID();
                }

                const keys = Object.keys(data);
                const values = Object.values(data);
                const placeholders = keys.map(() => "?").join(", ");

                await db.execute({
                    sql: `INSERT INTO ${target} (${keys.join(", ")}) VALUES (${placeholders})`,
                    args: values,
                });
                console.log(`Inserted into ${target} (id: ${data.id})`);
                break;
            }

            case "update": {
                if (!target || !extra) throw new Error("Table name and ID required");
                const data = parseKeyValue(args.slice(3));
                if (Object.keys(data).length === 0)
                    throw new Error("No data provided to update");

                const setClause = Object.keys(data)
                    .map((k) => `${k} = ?`)
                    .join(", ");
                const values = [...Object.values(data), extra]; // extra is id

                await db.execute({
                    sql: `UPDATE ${target} SET ${setClause} WHERE id = ?`,
                    args: values,
                });
                console.log(`Updated ${target}:${extra}`);
                break;
            }

            case "delete-row": {
                if (!target || !extra) throw new Error("Table name and ID required");
                await db.execute({
                    sql: `DELETE FROM ${target} WHERE id = ?`,
                    args: [extra],
                });
                console.log(`Deleted row ${extra} from ${target}`);
                break;
            }

            case "query": {
                if (!target) throw new Error("SQL Query required");
                const query = args.slice(1).join(" ");
                const res = await db.execute(query);
                console.log("\nQUERY RESULT\n");
                printTable(res.rows);
                break;
            }

            default:
                help();
        }
    } catch (e: any) {
        console.error("Error:", e.message);
        process.exit(1);
    }
};

run();
