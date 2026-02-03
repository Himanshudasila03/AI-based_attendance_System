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

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user info to request
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Optional: Role-based authorization
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
        }
        next();
    };
};

// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running' });
});

// REGISTER - Create new user account
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, studentId, section } = req.body;

    try {
        // Check if user already exists
        const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await db.query(
            'INSERT INTO users (name, email, password, role, student_id, section) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, student_id',
            [name, email, hashedPassword, role, studentId, section]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            ...user,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// LOGIN - Authenticate user
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password from response
        delete user.password;

        res.json({
            ...user,
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// ============================================
// PROTECTED ROUTES (Auth Required)
// ============================================

// Get current user info (verify token is valid)
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, student_id FROM users WHERE id = $1',
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

// ============================================
// SESSIONS API (Teacher Only)
// ============================================

// Get sessions - Teachers see only their own, filtered server-side
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        let query = `
            SELECT s.*, u.name as teacher_name 
            FROM sessions s 
            JOIN users u ON s.teacher_id = u.id 
        `;
        let params = [];

        // If user is a teacher, only show their sessions
        if (req.user.role === 'teacher') {
            query += ' WHERE s.teacher_id = $1';
            params.push(req.user.id);
        }
        // If admin role exists in future, they could see all sessions
        // For now, students shouldn't access this endpoint

        query += ' ORDER BY s.start_time DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create new session (Teacher only)
app.post('/api/sessions', authenticateToken, requireRole('teacher'), async (req, res) => {
    const { subject, location } = req.body;

    try {
        // Use authenticated user's ID, not from request body
        const teacherId = req.user.id;

        const result = await db.query(
            'INSERT INTO sessions (teacher_id, subject, teacher_location_lat, teacher_location_lng) VALUES ($1, $2, $3, $4) RETURNING *',
            [teacherId, subject, location?.latitude, location?.longitude]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// End session (Teacher only, their own sessions)
app.post('/api/sessions/:id/end', authenticateToken, requireRole('teacher'), async (req, res) => {
    const { id } = req.params;

    try {
        // Verify the session belongs to the authenticated teacher
        const check = await db.query('SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2', [id, req.user.id]);

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

// Delete session (Teacher only, their own sessions)
app.delete('/api/sessions/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
    const { id } = req.params;

    try {
        // Verify the session belongs to the authenticated teacher
        const check = await db.query('SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2', [id, req.user.id]);

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

// ============================================
// STUDENTS API
// ============================================

// Get all students (Teachers only)
app.get('/api/students', authenticateToken, requireRole('teacher'), async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, name, email, section, student_id FROM users WHERE role = 'student' ORDER BY name"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ============================================
// ATTENDANCE API
// ============================================

// Get attendance records
app.get('/api/attendance', authenticateToken, async (req, res) => {
    const { sessionId } = req.query;

    try {
        let query = `
            SELECT a.*, u.name as student_name, s.subject as session_subject 
            FROM attendance a 
            JOIN users u ON a.user_id = u.id
            LEFT JOIN sessions s ON a.session_id = s.id
        `;
        let params = [];
        let conditions = [];

        // Students can only see their own attendance
        if (req.user.role === 'student') {
            conditions.push(`a.user_id = $${conditions.length + 1}`);
            params.push(req.user.id);
        }

        // Teachers can see all attendance for their sessions
        if (req.user.role === 'teacher' && sessionId) {
            // Verify the session belongs to this teacher
            const sessionCheck = await db.query(
                'SELECT * FROM sessions WHERE id = $1 AND teacher_id = $2',
                [sessionId, req.user.id]
            );

            if (sessionCheck.rows.length > 0) {
                conditions.push(`a.session_id = $${conditions.length + 1}`);
                params.push(sessionId);
            } else {
                return res.status(403).json({ error: 'You can only view attendance for your own sessions' });
            }
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

// Mark attendance (Students only)
app.post('/api/attendance', authenticateToken, requireRole('student'), async (req, res) => {
    const { status, subject, sessionId } = req.body;

    try {
        // Use authenticated user's ID
        const userId = req.user.id;

        // If sessionId provided, verify it's active
        if (sessionId) {
            const sessionCheck = await db.query(
                'SELECT * FROM sessions WHERE id = $1 AND is_active = true',
                [sessionId]
            );

            if (sessionCheck.rows.length === 0) {
                return res.status(400).json({ error: 'Session is not active' });
            }
        }

        const result = await db.query(
            'INSERT INTO attendance (user_id, status, subject, session_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, status, subject, sessionId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('JWT Authentication enabled');
});
