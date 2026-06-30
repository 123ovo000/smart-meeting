// src/config/api.js
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export default apiConfig;
