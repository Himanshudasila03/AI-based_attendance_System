const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
};

const dbName = process.env.DB_NAME || 'attendance_system';

async function createDatabase() {
    const client = new Client({
        ...dbConfig,
        database: 'postgres', // Connect to default postgres DB
    });

    try {
        await client.connect();

        // Check if database exists
        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
        if (res.rowCount === 0) {
            console.log(`Database '${dbName}' does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database '${dbName}' created.`);
        } else {
            console.log(`Database '${dbName}' already exists.`);
        }
    } catch (err) {
        console.error('Error checking/creating database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function runSchema() {
    const client = new Client({
        ...dbConfig,
        database: dbName,
    });

    try {
        await client.connect();
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema...');
        await client.query(schemaSql);
        console.log('Schema applied successfully.');
    } catch (err) {
        console.error('Error applying schema:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function seedDatabase() {
    const client = new Client({
        ...dbConfig,
        database: dbName,
    });

    try {
        await client.connect();
        console.log('Seeding database...');

        // Seed Users
        const users = [
            {
                name: 'Teacher User',
                email: 'teacher@school.com',
                password: 'password123', // In a real app, hash this!
                role: 'teacher',
                student_id: null,
                stream: null,
                admission_year: null
            },
            {
                name: 'Student User',
                email: 'student@school.com',
                password: 'password123',
                role: 'student',
                student_id: 'STU001',
                stream: 'Computer Science',
                admission_year: '2024'
            },
            {
                name: 'Jane Doe',
                email: 'jane@school.com',
                password: 'password123',
                role: 'student',
                student_id: 'STU002',
                stream: 'Electrical Engineering',
                admission_year: '2023'
            }
        ];

        for (const user of users) {
            await client.query(`
                INSERT INTO users (name, email, password, role, student_id, stream, admission_year)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (email) DO NOTHING
            `, [user.name, user.email, user.password, user.role, user.student_id, user.stream, user.admission_year]);
        }

        console.log('Seeding complete.');
    } catch (err) {
        console.error('Error seeding database:', err);
        // Don't exit, just log user might already exist or DB issue
    } finally {
        await client.end();
    }
}

async function main() {
    await createDatabase();
    await runSchema();
    await seedDatabase();
}

main();
