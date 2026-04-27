const db = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
    console.log('Seeding database with hashed passwords...');

    try {
        
        const teacherPassword = await bcrypt.hash('teacher123', 10);
        const student1Password = await bcrypt.hash('student123', 10);
        const student2Password = await bcrypt.hash('jane123', 10);

        
        const teacherExists = await db.query("SELECT * FROM users WHERE email = 'teacher@example.com'");
        if (teacherExists.rows.length === 0) {
            await db.query(`
                INSERT INTO users (name, email, password, role) 
                VALUES ('John Teacher', 'teacher@example.com', $1, 'teacher')
            `, [teacherPassword]);
            console.log('✓ Teacher created: teacher@example.com / teacher123');
        } else {
            console.log('✓ Teacher already exists.');
        }

        
        const student1Exists = await db.query("SELECT * FROM users WHERE email = 'student@example.com'");
        if (student1Exists.rows.length === 0) {
            await db.query(`
                INSERT INTO users (name, email, password, role, student_id, section, program) 
                VALUES ('Alice Student', 'student@example.com', $1, 'student', 'S001', 'A', 'BTech')
            `, [student1Password]);
            console.log('✓ Student 1 created: student@example.com / student123');
        } else {
            console.log('✓ Student 1 already exists.');
        }

        
        const student2Exists = await db.query("SELECT * FROM users WHERE email = 'jane@example.com'");
        if (student2Exists.rows.length === 0) {
            await db.query(`
                INSERT INTO users (name, email, password, role, student_id, section, program) 
                VALUES ('Jane Doe', 'jane@example.com', $1, 'student', 'S002', 'B', 'BTech')
            `, [student2Password]);
            console.log('✓ Student 2 created: jane@example.com / jane123');
        } else {
            console.log('✓ Student 2 already exists.');
        }

        console.log('\n✅ Seeding complete. All passwords are now hashed.');
        console.log('\nTest Credentials:');
        console.log('  Teacher: teacher@example.com / teacher123');
        console.log('  Student: student@example.com / student123');
        console.log('  Student: jane@example.com / jane123');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
