const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = process.env.DATABASE_URL ? {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
} : {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
};

const dbName = process.env.DB_NAME || 'attendance_system';

async function createDatabase() {
    const client = new Client({
        ...dbConfig,
        database: 'postgres', 
    });

    try {
        await client.connect();
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

        const hashedPass = await bcrypt.hash('password123', 10);

        // 1. Seed Users
        const users = [
            {
                name: 'Admin User',
                email: 'admin@school.com',
                password: hashedPass, 
                role: 'admin',
                student_id: null,
                section: null,
                semester: null,
                program: null
            },
            {
                name: 'Teacher User',
                email: 'teacher@school.com',
                password: hashedPass, 
                role: 'teacher',
                student_id: null,
                section: null,
                semester: null,
                program: null
            },
            {
                name: 'Student User',
                email: 'student@school.com',
                password: hashedPass,
                role: 'student',
                student_id: 'STU001',
                section: 'A',
                semester: '1',
                program: 'BTech'
            },
            {
                name: 'Jane Doe',
                email: 'jane@school.com',
                password: hashedPass,
                role: 'student',
                student_id: 'STU002',
                section: 'B',
                semester: '1',
                program: 'BTech'
            }
        ];

        const insertedUsers = {};

        for (const user of users) {
            const res = await client.query(`
                INSERT INTO users (name, email, password, role, student_id, section, semester, program)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
                RETURNING id, role
            `, [user.name, user.email, user.password, user.role, user.student_id, user.section, user.semester, user.program]);
            insertedUsers[user.email] = res.rows[0].id;
        }

        // 2. Seed Courses
        const courses = [
            // Sem 1
            { name: 'Professional Communication', code: 'THU101' },
            { name: 'Engineering Chemistry', code: 'TCH101' },
            { name: 'Engineering Mathematics-I', code: 'TMA101' },
            { name: 'Basic Electronics Engineering', code: 'TEC101' },
            { name: 'Environmental Science', code: 'TEV101' },
            { name: 'Fundamental of Computer & Introduction to Programming', code: 'TCS101' },
            // Sem 2
            { name: 'Advanced Professional Communication', code: 'THU201' },
            { name: 'Engineering Physics', code: 'TPH201' },
            { name: 'Engineering Mathematics-II', code: 'TMA201' },
            { name: 'Basic Electrical Engineering', code: 'TEE201' },
            { name: 'Basics of Civil Engineering', code: 'TCE201' },
            { name: 'Programming For Problem Solving', code: 'TCS201' },
            { name: 'Healthy Living & Fitness', code: 'THF201' },
            // Sem 3
            { name: 'Logic Design & Computer Organization', code: 'TCS308' },
            { name: 'Data Structures with C', code: 'TCS302' },
            { name: 'Object Oriented Programming with C++', code: 'TCS307' },
            { name: 'Discrete Structures and Combinatorics', code: 'TMA316' },
            { name: 'Python Programming for Computing', code: 'TCS341' },
            { name: 'Career Skills', code: 'XCS301' },
            // Sem 4
            { name: 'Finite Automata & Formal Languages', code: 'TCS402' },
            { name: 'Microprocessors', code: 'TCS403' },
            { name: 'Fundamental of Statistics and AI', code: 'TCS421' },
            { name: 'Programming in Java', code: 'TCS408' },
            { name: 'Design and Analysis of Algorithms', code: 'TCS409' },
            { name: 'Career Skills', code: 'XCS401' },
            // Sem 5
            { name: 'Operating Systems', code: 'TCS502' },
            { name: 'Database Management Systems', code: 'TCS503' },
            { name: 'Machine Learning', code: 'TCS509' },
            { name: 'Computer System Security', code: 'TCS591' },
            { name: 'Computer Based Numerical and Statistical Techniques', code: 'TMA502' },
            { name: 'Career Skills', code: 'XCS501' },
            // Sem 6
            { name: 'Compiler Design', code: 'TCS601' },
            { name: 'Computer Networks - I', code: 'TCS604' },
            { name: 'Software Engineering', code: 'TCS611' },
            { name: 'Affective Computing Through Swayam', code: 'TCS682' },
            { name: 'Full Stack Web Development', code: 'TCS693' },
            { name: 'Career Skills', code: 'XCS601' },
            // Sem 7
            { name: 'Computer Networks-II', code: 'TCS703' },
            { name: 'Advanced Computer Architecture', code: 'TCS704' },
            { name: 'Artificial Intelligence', code: 'TCS706' },
            { name: 'Human Computer Interaction', code: 'TCS756' },
            { name: 'Cryptography & Network Security', code: 'TIT704' },
            // Sem 8
            { name: 'Storage Networks', code: 'TCS851' },
            { name: 'Disaster Management', code: 'TDM881' },
            { name: 'Mobile Computing', code: 'TOE811' }
        ];

        const insertedCourses = {};

        for (const course of courses) {
            const res = await client.query(`
                INSERT INTO courses (course_name, course_code)
                VALUES ($1, $2)
                ON CONFLICT (course_code) DO UPDATE SET course_name = EXCLUDED.course_name
                RETURNING id
            `, [course.name, course.code]);
            insertedCourses[course.code] = res.rows[0].id;
        }

        // 2.5 Seed Program Subjects
        const programSubjects = [
            // Sem 1
            { program: 'BTech', semester: '1', courseCode: 'THU101' },
            { program: 'BTech', semester: '1', courseCode: 'TCH101' },
            { program: 'BTech', semester: '1', courseCode: 'TMA101' },
            { program: 'BTech', semester: '1', courseCode: 'TEC101' },
            { program: 'BTech', semester: '1', courseCode: 'TEV101' },
            { program: 'BTech', semester: '1', courseCode: 'TCS101' },
            // Sem 2
            { program: 'BTech', semester: '2', courseCode: 'THU201' },
            { program: 'BTech', semester: '2', courseCode: 'TPH201' },
            { program: 'BTech', semester: '2', courseCode: 'TMA201' },
            { program: 'BTech', semester: '2', courseCode: 'TEE201' },
            { program: 'BTech', semester: '2', courseCode: 'TCE201' },
            { program: 'BTech', semester: '2', courseCode: 'TCS201' },
            { program: 'BTech', semester: '2', courseCode: 'THF201' },
            // Sem 3
            { program: 'BTech', semester: '3', courseCode: 'TCS308' },
            { program: 'BTech', semester: '3', courseCode: 'TCS302' },
            { program: 'BTech', semester: '3', courseCode: 'TCS307' },
            { program: 'BTech', semester: '3', courseCode: 'TMA316' },
            { program: 'BTech', semester: '3', courseCode: 'TCS341' },
            { program: 'BTech', semester: '3', courseCode: 'XCS301' },
            // Sem 4
            { program: 'BTech', semester: '4', courseCode: 'TCS402' },
            { program: 'BTech', semester: '4', courseCode: 'TCS403' },
            { program: 'BTech', semester: '4', courseCode: 'TCS421' },
            { program: 'BTech', semester: '4', courseCode: 'TCS408' },
            { program: 'BTech', semester: '4', courseCode: 'TCS409' },
            { program: 'BTech', semester: '4', courseCode: 'XCS401' },
            // Sem 5
            { program: 'BTech', semester: '5', courseCode: 'TCS502' },
            { program: 'BTech', semester: '5', courseCode: 'TCS503' },
            { program: 'BTech', semester: '5', courseCode: 'TCS509' },
            { program: 'BTech', semester: '5', courseCode: 'TCS591' },
            { program: 'BTech', semester: '5', courseCode: 'TMA502' },
            { program: 'BTech', semester: '5', courseCode: 'XCS501' },
            // Sem 6
            { program: 'BTech', semester: '6', courseCode: 'TCS601' },
            { program: 'BTech', semester: '6', courseCode: 'TCS604' },
            { program: 'BTech', semester: '6', courseCode: 'TCS611' },
            { program: 'BTech', semester: '6', courseCode: 'TCS682' },
            { program: 'BTech', semester: '6', courseCode: 'TCS693' },
            { program: 'BTech', semester: '6', courseCode: 'XCS601' },
            // Sem 7
            { program: 'BTech', semester: '7', courseCode: 'TCS703' },
            { program: 'BTech', semester: '7', courseCode: 'TCS704' },
            { program: 'BTech', semester: '7', courseCode: 'TCS706' },
            { program: 'BTech', semester: '7', courseCode: 'TCS756' },
            { program: 'BTech', semester: '7', courseCode: 'TIT704' },
            // Sem 8
            { program: 'BTech', semester: '8', courseCode: 'TCS851' },
            { program: 'BTech', semester: '8', courseCode: 'TDM881' },
            { program: 'BTech', semester: '8', courseCode: 'TOE811' }
        ];

        for (const ps of programSubjects) {
            const courseId = insertedCourses[ps.courseCode];
            if (courseId) {
                await client.query(`
                    INSERT INTO program_subjects (program, semester, course_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (program, semester, course_id) DO NOTHING
                `, [ps.program, ps.semester, courseId]);
            }
        }

        // 3. Seed Enrollments
        const enrollments = [
            { studentEmail: 'student@school.com', courseCode: 'THU101' },
            { studentEmail: 'student@school.com', courseCode: 'TCH101' },
            { studentEmail: 'jane@school.com', courseCode: 'TMA101' },
            { studentEmail: 'jane@school.com', courseCode: 'TEC101' }
        ];

        for (const enr of enrollments) {
            const studentId = insertedUsers[enr.studentEmail];
            const courseId = insertedCourses[enr.courseCode];

            if (studentId && courseId) {
                await client.query(`
                    INSERT INTO enrollments (student_id, course_id)
                    VALUES ($1, $2)
                    ON CONFLICT (student_id, course_id) DO NOTHING
                `, [studentId, courseId]);
            }
        }

        console.log('Seeding complete.');
    } catch (err) {
        console.error('Error seeding database:', err);
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
