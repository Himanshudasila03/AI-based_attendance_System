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

        
        

        console.log('Altering users table...');

        
        await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS section VARCHAR(50)');

        
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS admission_year');
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS stream');

        

        console.log('Migration successful: Added section, removed admission_year and stream.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
