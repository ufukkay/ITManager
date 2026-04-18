import axios from 'axios';

const api = axios.create({
  // Since we use proxy in vite.config.js, base URL is just '/'
  baseURL: '/',
  // Send cookies with requests (for session management)
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Response interceptor for handling common errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // User is not authenticated, could redirect to login here
      // But we will handle this in the auth store or router guard
      console.warn('Unauthorized access detected');
    }
    return Promise.reject(error);
  }
);

export default api;
