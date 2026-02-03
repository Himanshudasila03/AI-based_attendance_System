// API utility with JWT authentication support

const API_BASE_URL = '/api';

// Get token from localStorage
const getToken = (): string | null => {
    const user = localStorage.getItem('user');
    if (user) {
        try {
            const parsed = JSON.parse(user);
            return parsed.token || null;
        } catch {
            return null;
        }
    }
    return null;
};

// Make authenticated API request
export const apiRequest = async (
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> => {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    // If unauthorized, clear user data and redirect to login
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('user');
        window.location.href = '/login';
    }

    return response;
};

// Convenience methods
export const api = {
    get: (endpoint: string) => apiRequest(endpoint, { method: 'GET' }),

    post: (endpoint: string, data: any) =>
        apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    put: (endpoint: string, data: any) =>
        apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (endpoint: string) =>
        apiRequest(endpoint, { method: 'DELETE' }),
};
