import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Event listener for auth unauthorized signals
let onUnauthorizedCallback = null;

export const setOnUnauthorizedCallback = (cb) => {
  onUnauthorizedCallback = cb;
};

// Request Interceptor: Attach JWT Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Centralize Error extraction
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        // Clear token
        localStorage.removeItem('auth_token');
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        } else {
          // If no handler set and not already on login, redirect
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }

      // Format custom error message from API response
      const serverMessage = data?.message || data?.error || 'An unexpected error occurred.';
      const validationDetails = Array.isArray(data?.errors)
        ? data.errors.map((e) => `${e.field}: ${e.message}`).join(', ')
        : null;

      const enhancedError = new Error(validationDetails ? `${serverMessage} (${validationDetails})` : serverMessage);
      enhancedError.status = status;
      enhancedError.data = data;
      return Promise.reject(enhancedError);
    } else if (error.request) {
      const networkError = new Error('Unable to connect to security server. Please check your network or server status.');
      networkError.status = 0;
      return Promise.reject(networkError);
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
