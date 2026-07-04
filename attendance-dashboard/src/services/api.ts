import axios from 'axios';
import { getToken, deleteToken } from './auth';

// Use local host when accessing on localhost, fallback to the public keepalive tunnel
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://6e62dd6368cbaf.lhr.life';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Setup 401 logout callback hook
let onUnauthorizedCallback: (() => void) | null = null;
let onForbiddenCallback: ((message: string) => void) | null = null;

export function setupAuthInterceptors(
  onUnauthorized: () => void,
  onForbidden: (message: string) => void
) {
  onUnauthorizedCallback = onUnauthorized;
  onForbiddenCallback = onForbidden;
}

// Request Interceptor: Attach the JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Error Handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        deleteToken();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        } else {
          window.location.href = '/login';
        }
      } else if (status === 403) {
        const errorMsg = error.response.data?.error || 'Access Denied: You do not have permission.';
        if (onForbiddenCallback) {
          onForbiddenCallback(errorMsg);
        }
      }
    }
    return Promise.reject(error);
  }
);
