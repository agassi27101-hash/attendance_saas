import axios from 'axios';
import { Platform } from 'react-native';
import { getToken, deleteToken } from './auth';
import { router } from 'expo-router';

// Use the public localhost.run tunnel URL to bypass Wi-Fi/firewall restrictions
// and allow physical devices running Expo Go to connect to the backend server.
const BASE_URL = 'https://7adb17239b717e.lhr.life';

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
