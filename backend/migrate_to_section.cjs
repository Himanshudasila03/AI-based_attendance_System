const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function migrate() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('Connected to database...');

        // Check if columns exist before dropping (to be safe/idempotent-ish)
        // Actually, we can just try to add 'section' and drop others.

        console.log('Altering users table...');

        // Add section column
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS section VARCHAR(50)');

        // Drop admission_year and stream columns
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS admission_year');
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS stream');

        // Also clean up manual entries if any? No, data in dropped columns is gone. That's expected.

        console.log('Migration successful: Added section, removed admission_year and stream.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
