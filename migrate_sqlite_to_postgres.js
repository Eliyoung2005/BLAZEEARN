const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// 1. Configure the Postgres connection
// When running locally, you must provide the DATABASE_URL in your terminal before running this script
const pgConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!pgConnectionString) {
    console.error("❌ ERROR: DATABASE_URL environment variable is missing.");
    console.error("Please run this script with your Postgres URL. Example:");
    console.error("set DATABASE_URL=postgres://user:pass@host/db && node migrate_sqlite_to_postgres.js");
    process.exit(1);
}

// 2. Setup Database connections
const pgPool = new Pool({
    connectionString: pgConnectionString,
    ssl: { rejectUnauthorized: false }
});

const sqliteDbPath = path.resolve(__dirname, 'users.db');
const sqliteDb = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("❌ ERROR: Could not open SQLite database users.db", err.message);
        process.exit(1);
    }
});

// Tables to migrate
const tables = [
    'users',
    'coupons',
    'withdrawals',
    'tasks',
    'vendors',
    'data_claims',
    'settings',
    'user_tasks',
    'email_verifications'
];

async function migrateTable(tableName) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${tableName}`, [], async (err, rows) => {
            if (err) {
                console.error(`Error reading from SQLite table ${tableName}:`, err.message);
                // If a table doesn't exist in SQLite, just skip it
                if (err.message.includes("no such table")) {
                    console.log(`⚠️ Table ${tableName} does not exist in SQLite, skipping.`);
                    return resolve();
                }
                return reject(err);
            }

            if (rows.length === 0) {
                console.log(`✅ Table ${tableName} is empty. Skipping.`);
                return resolve();
            }

            console.log(`⏳ Migrating ${rows.length} rows for table: ${tableName}...`);

            const client = await pgPool.connect();
            try {
                await client.query('BEGIN'); // Start transaction
                
                for (const row of rows) {
                    const columns = Object.keys(row);
                    const values = Object.values(row);
                    
                    // Create parameterized query for Postgres (e.g. $1, $2, $3)
                    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
                    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                    
                    try {
                        await client.query(query, values);
                    } catch (insertErr) {
                        console.error(`Error inserting row into ${tableName}:`, insertErr.message);
                    }
                }
                
                await client.query('COMMIT'); // Commit transaction
                console.log(`✅ Successfully migrated ${tableName}!`);
            } catch (e) {
                await client.query('ROLLBACK');
                console.error(`❌ Failed to migrate ${tableName}:`, e.message);
            } finally {
                client.release();
                resolve();
            }
        });
    });
}

async function startMigration() {
    console.log("🚀 Starting Database Migration from SQLite to PostgreSQL...");
    console.log(`📡 Connected to Postgres: ${pgConnectionString.split('@')[1]}`); // Log host safely
    
    // Make sure Postgres tables exist first by triggering database.js initialization logic
    console.log("⏳ Ensuring PostgreSQL tables exist...");
    const db = require('./database.js'); 
    
    // Wait a few seconds for database.js to create the tables asynchronously
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        for (const table of tables) {
            await migrateTable(table);
        }
        
        console.log("🎉 Migration Complete! All data has been copied to PostgreSQL.");
        console.log("You can now safely deploy to Railway.");
    } catch (e) {
        console.error("❌ Migration encountered a fatal error:", e);
    } finally {
        sqliteDb.close();
        await pgPool.end();
        process.exit(0);
    }
}

startMigration();
