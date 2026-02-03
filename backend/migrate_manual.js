const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'attendance_system',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function migrate() {
    try {
        await client.connect();
        console.log('Migrating database...');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS admission_year VARCHAR(10)');
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS stream VARCHAR(50)');
        // Sessions table is new, schema.sql handles CREATE TABLE IF NOT EXISTS, but let's just make sure.
        // If init_db ran schema.sql, sessions table should exist, but "users" columns might be missing if users table existed.
        console.log('Migration complete.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
