const { Client } = require('pg');
require('dotenv').config({ path: './.env' }); 

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function clearStudents() {
    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('Connected to database...');

        
        console.log('Deleting student attendance records...');
        await client.query(`
            DELETE FROM attendance 
            WHERE user_id IN (SELECT id FROM users WHERE role = 'student')
        `);

        
        console.log('Deleting student accounts...');
        const res = await client.query(`
            DELETE FROM users 
            WHERE role = 'student'
        `);

        console.log(`Success! Deleted ${res.rowCount} student records.`);

    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        await client.end();
    }
}

clearStudents();
