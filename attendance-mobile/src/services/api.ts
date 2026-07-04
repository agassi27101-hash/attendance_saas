import axios from 'axios';
import { Platform } from 'react-native';
import { getToken, deleteToken } from './auth';
import { router } from 'expo-router';

// Android emulator uses 10.0.2.2 to access host's localhost.
// iOS simulator can use localhost directly.
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3001',
  default: 'http://localhost:3001',
});

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
});

// Request Interceptor: Attach the JWT token if it exists
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login on 401
      await deleteToken();
      router.replace('/login');
    }
    return Promise.reject(error);
  }
);
