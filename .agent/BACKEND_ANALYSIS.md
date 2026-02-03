# Backend API Analysis - Attendance System

## Overview
This document analyzes the backend authentication and data serving logic to identify the issue where teachers see other teachers' data.

---

## 🔐 Authentication Flow

### 1. **Registration** (`POST /api/register`)
```javascript
// Lines 16-32
app.post('/api/register', async (req, res) => {
    const { name, email, password, role, studentId } = req.body;
    // Check if user exists
    // Insert new user
    // Return user object
});
```

**Issues:**
- ❌ **NO PASSWORD HASHING** - Passwords stored in plain text
- ❌ **NO JWT/SESSION TOKENS** - No authentication tokens generated
- ✅ Returns user object with role

### 2. **Login** (`POST /api/login`)
```javascript
// Lines 34-48
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    // Query: SELECT * FROM users WHERE email = $1 AND password = $2
    // Return user object (without password)
});
```

**Issues:**
- ❌ **NO SESSION MANAGEMENT** - No tokens, cookies, or session tracking
- ❌ **PLAIN TEXT PASSWORD COMPARISON** - Security vulnerability
- ✅ Removes password before sending to frontend
- ✅ Returns user with role and id

---

## 📊 Data Serving Logic

### 3. **Sessions API** (`GET /api/sessions`)
```javascript
// Lines 51-72
app.get('/api/sessions', async (req, res) => {
    const { teacherId } = req.query;
    let query = `
      SELECT s.*, u.name as teacher_name 
      FROM sessions s 
      JOIN users u ON s.teacher_id = u.id 
    `;
    if (teacherId) {
        query += ' WHERE s.teacher_id = $1';
        params.push(teacherId);
    }
    query += ' ORDER BY s.start_time DESC';
});
```

**Analysis:**
- ✅ **FILTERING IMPLEMENTED** - Now filters by teacherId when provided
- ⚠️ **OPTIONAL FILTERING** - If teacherId is not provided, returns ALL sessions
- ⚠️ **NO SERVER-SIDE AUTH CHECK** - Doesn't verify if the requesting user is actually a teacher

**Problem:** The frontend MUST pass `teacherId` in the query params. If it doesn't, all sessions are returned.

### 4. **Frontend Session Fetch** (CaptureAttendance.tsx)
```typescript
// Line 36 (after fix)
const response = await fetch(`/api/sessions?teacherId=${user.id}`);
```

**Analysis:**
- ✅ **NOW PASSES teacherId** - After our fix
- ⚠️ **CLIENT-SIDE ONLY** - Relies on localStorage user.id
- ❌ **NO SERVER VERIFICATION** - Backend doesn't verify the user is authenticated

---

## 🐛 ROOT CAUSE ANALYSIS

### Why Teachers See Other Teachers' Data:

1. **No Authentication Middleware**
   - Backend has NO middleware to verify requests
   - Any client can call any endpoint
   - No way to verify WHO is making the request

2. **Client-Side Trust Model**
   - System trusts `user.id` from localStorage
   - Anyone can modify localStorage
   - No server-side session validation

3. **Optional Filtering**
   - If frontend forgets to pass `teacherId`, ALL data is returned
   - No default filtering based on authenticated user

---

## 🔧 CURRENT STATE (After Fix)

### What We Fixed:
✅ Backend now accepts `teacherId` query parameter  
✅ Frontend now passes `user.id` as `teacherId`  
✅ SQL query filters sessions by teacher_id  

### What Still Needs Fixing:

1. **Authentication System**
   - Implement JWT tokens or session cookies
   - Add authentication middleware
   - Verify user identity on every request

2. **Authorization**
   - Server should determine user from token, not query params
   - Enforce role-based access control
   - Prevent students from accessing teacher endpoints

3. **Security**
   - Hash passwords (bcrypt)
   - Use HTTPS in production
   - Implement rate limiting
   - Add CSRF protection

---

## 📋 API Endpoints Summary

| Endpoint | Method | Auth Required? | Filters Data? | Issue |
|----------|--------|----------------|---------------|-------|
| `/api/register` | POST | ❌ No | N/A | No password hashing |
| `/api/login` | POST | ❌ No | N/A | No token generation |
| `/api/sessions` | GET | ❌ No | ✅ Yes (if teacherId provided) | Optional filtering |
| `/api/sessions` | POST | ❌ No | N/A | Anyone can create sessions |
| `/api/sessions/:id/end` | POST | ❌ No | ❌ No | Anyone can end any session |
| `/api/sessions/:id` | DELETE | ❌ No | ❌ No | Anyone can delete any session |
| `/api/students` | GET | ❌ No | ❌ No | Returns ALL students |
| `/api/attendance` | GET | ❌ No | ⚠️ Partial | Filters by userId/sessionId if provided |
| `/api/attendance` | POST | ❌ No | N/A | Anyone can mark attendance |

---

## 🎯 Recommended Architecture

### Proper Authentication Flow:

```
1. User logs in → Backend generates JWT token
2. Frontend stores token (httpOnly cookie or localStorage)
3. Every request includes token in Authorization header
4. Backend middleware verifies token
5. Backend extracts user info from token
6. Backend filters data based on authenticated user
```

### Example Middleware:
```javascript
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user; // Attach user to request
        next();
    });
};

// Usage
app.get('/api/sessions', authenticateToken, async (req, res) => {
    const teacherId = req.user.id; // Get from verified token, not query params
    // ... rest of logic
});
```

---

## 🚨 Security Vulnerabilities

1. **Critical:**
   - Plain text passwords
   - No authentication
   - No authorization checks
   - SQL injection risk (using parameterized queries helps, but not complete)

2. **High:**
   - Anyone can access any data
   - Anyone can modify any data
   - No rate limiting
   - No input validation

3. **Medium:**
   - No CORS restrictions
   - No request logging
   - No error handling standards

---

## ✅ Immediate Fix Applied

The immediate fix ensures that:
- Frontend passes `teacherId` when fetching sessions
- Backend filters sessions by `teacherId`
- Each teacher only sees their own sessions

**However, this is NOT secure** - it's a client-side fix. A malicious user could still:
- Modify the `teacherId` parameter
- Access other teachers' data
- Create/delete sessions for other teachers

**For production, you MUST implement proper authentication.**
