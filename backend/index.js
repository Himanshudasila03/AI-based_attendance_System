const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

app.use(cors());
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
        }
        next();
    };
};

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

app.post('/api/register', async (req, res) => {
    const { name, email, password, role, studentId, section, semester, program } = req.body;
    try {
        const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (name, email, password, role, student_id, section, semester, program) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, student_id',
            [name, email, hashedPassword, role, studentId, section, semester, program]
        );
        const user = result.rows[0];

        // Auto-enroll if student and program/semester match
        if (role === 'student' && program && semester) {
            const coursesRes = await db.query(
                'SELECT course_id FROM program_subjects WHERE program = $1 AND semester = $2',
                [program, semester]
            );
            for (const row of coursesRes.rows) {
                await db.query(
                    'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [user.id, row.course_id]
                );
            }
        }
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ ...user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        delete user.password;
        res.json({ ...user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, student_id, section, semester, program FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// -- COURSES API --
app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM courses ORDER BY course_name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/courses', authenticateToken, requireRole('admin'), async (req, res) => {
    const { courseName, courseCode } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO courses (course_name, course_code) VALUES ($1, $2) RETURNING *',
            [courseName, courseCode]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// -- PROGRAM SUBJECTS API --
app.get('/api/program-subjects', authenticateToken, async (req, res) => {
    const { program, semester } = req.query;
    try {
        if (!program || !semester) {
            return res.status(400).json({ error: 'Program and semester are required' });
        }
        const result = await db.query(`
            SELECT c.* 
            FROM courses c
            JOIN program_subjects ps ON c.id = ps.course_id
            WHERE ps.program = $1 AND ps.semester = $2
        `, [program, semester]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// -- ENROLLMENTS API --
app.get('/api/enrollments', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT e.id as enrollment_id, e.student_id, e.course_id, c.course_name, c.course_code, u.name as student_name
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN users u ON e.student_id = u.id
        `;
        let params = [];

        if (req.user.role === 'student') {
            query += ' WHERE e.student_id = $1';
            params.push(req.user.id);
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/enrollments', authenticateToken, requireRole('admin'), async (req, res) => {
    const { studentId, courseId } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *',
            [studentId, courseId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// -- SESSIONS API --
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT s.*, u.name as teacher_name, c.course_name as subject, c.course_code 
            FROM sessions s 
            JOIN users u ON s.teacher_id = u.id 
            JOIN courses c ON s.course_id = c.id
        `;
        let params = [];

        if (req.user.role === 'teacher') {
            query += ' WHERE s.teacher_id = $1';
            params.push(req.user.id);
        } else if (req.user.role === 'student') {
            // Students only see sessions for courses they are enrolled in, and matching their semester and section
            query += ` WHERE s.course_id IN (SELECT course_id FROM enrollments WHERE student_id = $1)`;
            query += ` AND (s.semester = (SELECT semester FROM users WHERE id = $1) OR s.semester IS NULL)`;
            query += ` AND ((SELECT section FROM users WHERE id = $1) = ANY(s.sections) OR array_length(s.sections, 1) IS NULL)`;
            params.push(req.user.id);
        }

        query += ' ORDER BY s.start_time DESC';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/sessions', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    const { courseId, location, semester, sections } = req.body;
    try {
        const teacherId = req.user.id;
        const result = await db.query(
            'INSERT INTO sessions (teacher_id, course_id, teacher_location_lat, teacher_location_lng, semester, sections) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [teacherId, courseId, location?.latitude, location?.longitude, semester, sections]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/sessions/:id/end', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    const { id } = req.params;
    try {
        let checkQuery = 'SELECT * FROM sessions WHERE id = $1';
        let checkParams = [id];
        if (req.user.role === 'teacher') {
            checkQuery += ' AND teacher_id = $2';
            checkParams.push(req.user.id);
        }

        const check = await db.query(checkQuery, checkParams);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'You can only end your own sessions' });
        }

        const result = await db.query(
            'UPDATE sessions SET is_active = false, end_time = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
            [id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.delete('/api/sessions/:id', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    const { id } = req.params;
    try {
        let checkQuery = 'SELECT * FROM sessions WHERE id = $1';
        let checkParams = [id];
        if (req.user.role === 'teacher') {
            checkQuery += ' AND teacher_id = $2';
            checkParams.push(req.user.id);
        }

        const check = await db.query(checkQuery, checkParams);
        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'You can only delete your own sessions' });
        }

        await db.query('DELETE FROM attendance WHERE session_id = $1', [id]);
        await db.query('DELETE FROM sessions WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/students', authenticateToken, requireRole('teacher', 'admin'), async (req, res) => {
    const { sessionId } = req.query;
    try {
        let query = "SELECT id, name, email, section, program, semester, student_id FROM users WHERE role = 'student'";
        let params = [];

        if (sessionId) {
            const sessionRes = await db.query('SELECT course_id, semester, sections FROM sessions WHERE id = $1', [sessionId]);
            if (sessionRes.rows.length > 0) {
                const session = sessionRes.rows[0];

                query += ` AND id IN (SELECT student_id FROM enrollments WHERE course_id = $${params.length + 1})`;
                params.push(session.course_id);

                if (session.semester) {
                    query += ` AND semester = $${params.length + 1}`;
                    params.push(session.semester);
                }

                if (session.sections && session.sections.length > 0 && session.sections[0] !== '') {
                    query += ` AND section = ANY($${params.length + 1})`;
                    params.push(session.sections);
                }
            }
        }

        query += " ORDER BY name";
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/attendance', authenticateToken, async (req, res) => {
    const { sessionId } = req.query;
    try {
        let query = `
            SELECT a.*, u.name as student_name, u.section, u.program, s.semester, c.course_name as session_subject 
            FROM attendance a 
            JOIN users u ON a.user_id = u.id
            JOIN sessions s ON a.session_id = s.id
            JOIN courses c ON s.course_id = c.id
        `;
        let params = [];
        let conditions = [];

        if (req.user.role === 'student') {
            conditions.push(`a.user_id = $${conditions.length + 1}`);
            params.push(req.user.id);
        }

        if (req.user.role === 'teacher') {
            if (sessionId) {
                const sessionCheck = await db.query(
                    'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
                    [sessionId, req.user.id]
                );
                if (sessionCheck.rows.length === 0) {
                    return res.status(403).json({ error: 'You can only view attendance for your own sessions' });
                }
                conditions.push(`a.session_id = $${conditions.length + 1}`);
                params.push(sessionId);
            } else {
                conditions.push(`s.teacher_id = $${conditions.length + 1}`);
                params.push(req.user.id);
            }
        } else if (req.user.role === 'admin' && sessionId) {
            conditions.push(`a.session_id = $${conditions.length + 1}`);
            params.push(sessionId);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY a.timestamp DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/attendance', authenticateToken, requireRole('student'), async (req, res) => {
    const { status, sessionId } = req.body;
    try {
        const userId = req.user.id;

        if (sessionId) {
            const sessionCheck = await db.query(
                'SELECT * FROM sessions WHERE id = $1 AND is_active = true',
                [sessionId]
            );
            if (sessionCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Session is not active' });
            }
        } else {
            return res.status(400).json({ error: 'sessionId required' });
        }

        const result = await db.query(
            'INSERT INTO attendance (user_id, status, session_id) VALUES ($1, $2, $3) RETURNING *',
            [userId, status, sessionId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/face-encoding', authenticateToken, async (req, res) => {
    const { encodingData } = req.body;
    if (!encodingData || !Array.isArray(encodingData)) {
        return res.status(400).json({ error: 'Invalid encoding data provided.' });
    }
    try {
        const userId = req.user.id;

        // Check if user already has a face registered
        const existingFace = await db.query('SELECT id FROM face_encodings WHERE user_id = $1', [userId]);
        if (existingFace.rows.length > 0) {
            return res.status(403).json({ error: 'Your face is already registered. You must get permission from an Admin to re-register.' });
        }

        const result = await db.query(
            `INSERT INTO face_encodings (user_id, encoding_data) 
             VALUES ($1, $2) 
             RETURNING id, registered_at`,
            [userId, JSON.stringify(encodingData)]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const getFaceEncodingHandler = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;
        const result = await db.query(
            'SELECT encoding_data FROM face_encodings WHERE user_id = $1',
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Face encoding not found for this user.' });
        }
        res.json({ encodingData: result.rows[0].encoding_data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

app.get('/api/face-encoding', authenticateToken, getFaceEncodingHandler);
app.get('/api/face-encoding/:userId', authenticateToken, getFaceEncodingHandler);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('JWT Authentication enabled');
});
