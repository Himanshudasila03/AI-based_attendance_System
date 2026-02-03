CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    student_id VARCHAR(50),
    role VARCHAR(50) DEFAULT 'student',
    section VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    teacher_location_lat DOUBLE PRECISION,
    teacher_location_lng DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id),
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    subject VARCHAR(100), -- Keeping for backward compatibility or direct logging
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
