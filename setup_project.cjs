const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');

console.log('=== Starting Project Setup ===');

// 1. Install Backend Dependencies
console.log('\n--- Installing Backend Dependencies ---');
try {
    execSync('npm install', { cwd: backendDir, stdio: 'inherit' });
} catch (error) {
    console.error('Failed to install backend dependencies.');
    process.exit(1);
}

// 2. Install Frontend Dependencies
console.log('\n--- Installing Frontend Dependencies ---');
try {
    execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
    console.error('Failed to install frontend dependencies.');
    process.exit(1);
}

// 3. Setup Database
console.log('\n--- Setting up Database ---');
try {
    // Check if .env exists in backend, if not tell user to check it
    if (!fs.existsSync(path.join(backendDir, '.env'))) {
        console.warn('Warning: backend/.env file not found. Database connection might fail if defaults are incorrect.');
    }
    execSync('node init_db.js', { cwd: backendDir, stdio: 'inherit' });
    execSync('node seed_db.js', { cwd: backendDir, stdio: 'inherit' });
} catch (error) {
    console.error('Failed to setup database. Make sure PostgreSQL is running and credentials in backend/.env are correct.');
    // We don't exit here because maybe they want to run anyway
}

// 4. Run Backend and Frontend
console.log('\n=== Setup Complete. Starting Backend and Frontend ===');

const backend = spawn('node', ['index.js'], { cwd: backendDir, stdio: 'inherit' });
const frontend = spawn('npm', ['run', 'dev'], { cwd: rootDir, stdio: 'inherit' });

backend.on('error', (err) => {
    console.error('Failed to start backend:', err);
});

frontend.on('error', (err) => {
    console.error('Failed to start frontend:', err);
});

process.on('SIGINT', () => {
    console.log('Stopping processes...');
    backend.kill();
    frontend.kill();
    process.exit();
});
